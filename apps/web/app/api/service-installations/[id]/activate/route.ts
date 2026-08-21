import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
type Installation = {
  installationId: string;
  serviceAccountId: string | null;
  meterId: string | null;
  installationDate: string | null;
  installerId: string | null;
  status: string;
  remarks: string | null;
};
const fail = (message: string, status: number) =>
  Response.json({ success: false, message }, { status });

export async function POST(_: Request, { params }: Context) {
  const auth = await requirePermission("METER_INSTALLATION_EDIT");
  if (auth.response) return auth.response;

  const installationId = (await params).id;
  if (!/^\d+$/.test(installationId))
    return fail("Service installation not found.", 404);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const installation = await client.query<Installation>(
      `SELECT installation_id::text AS "installationId",
              service_account_id::text AS "serviceAccountId",
              meter_id::text AS "meterId",
              installation_date::text AS "installationDate",
              installer_id::text AS "installerId",
              installation_status AS status,
              remarks
         FROM service_installations
        WHERE installation_id=$1
        FOR UPDATE`,
      [installationId],
    );
    const item = installation.rows[0];
    if (!item) {
      await client.query("ROLLBACK");
      return fail("Service installation not found.", 404);
    }
    if (item.status !== "COMPLETED") {
      await client.query("ROLLBACK");
      return fail("Only completed service installations can be activated.", 400);
    }
    if (!item.serviceAccountId) {
      await client.query("ROLLBACK");
      return fail("The completed installation has no service account.", 400);
    }
    if (!item.meterId) {
      await client.query("ROLLBACK");
      return fail("The completed installation has no meter.", 400);
    }
    if (!item.installationDate) {
      await client.query("ROLLBACK");
      return fail("The completed installation has no installation date.", 400);
    }
    if (!item.installerId) {
      await client.query("ROLLBACK");
      return fail("The completed installation has no installer.", 400);
    }

    const [activeStatus, account, meter, currentHistory] = await Promise.all([
      client.query<{ id: string }>(
        `SELECT connection_status_id::text AS id
           FROM mt_connection_status
          WHERE status_code='ACTIVE' AND is_active=TRUE
          LIMIT 1`,
      ),
      client.query<{ connectionStatusId: string | null }>(
        `SELECT connection_status_id::text AS "connectionStatusId"
           FROM service_accounts
          WHERE service_account_id=$1
          FOR UPDATE`,
        [item.serviceAccountId],
      ),
      client.query<{ status: string; serviceAccountId: string }>(
        `SELECT status,service_account_id::text AS "serviceAccountId"
           FROM meters
          WHERE meter_id=$1
          FOR UPDATE`,
        [item.meterId],
      ),
      client.query<{ installationDate: string; installationType: string | null; serviceAccountId: string }>(
        `SELECT installation_date::text AS "installationDate",
                installation_type AS "installationType",
                service_account_id::text AS "serviceAccountId"
           FROM meter_installations
          WHERE meter_id=$1 AND removed_date IS NULL
          FOR UPDATE`,
        [item.meterId],
      ),
    ]);

    const activeStatusId = activeStatus.rows[0]?.id;
    if (!activeStatusId) throw new Error("ACTIVE_STATUS_MISSING");
    const accountRow = account.rows[0];
    if (!accountRow) throw new Error("ACCOUNT_NOT_FOUND");
    const meterRow = meter.rows[0];
    if (!meterRow) throw new Error("METER_NOT_FOUND");
    if (meterRow.serviceAccountId !== item.serviceAccountId)
      throw new Error("METER_ACCOUNT_MISMATCH");

    const matchingHistory = currentHistory.rows.find(
      (row) =>
        row.serviceAccountId === item.serviceAccountId &&
        row.installationDate === item.installationDate &&
        row.installationType === "INITIAL",
    );
    const accountIsActive = accountRow.connectionStatusId === activeStatusId;
    const meterIsActive = meterRow.status === "ACTIVE";

    if (accountIsActive && meterIsActive && matchingHistory && currentHistory.rows.length === 1) {
      await client.query("COMMIT");
      return Response.json({
        success: true,
        alreadyActivated: true,
        data: {
          installationId: item.installationId,
          serviceAccountId: item.serviceAccountId,
          meterId: item.meterId,
          installationDate: item.installationDate,
          serviceStatus: "ACTIVE",
          meterStatus: "ACTIVE",
          meterInstallationCreated: false,
          alreadyActivated: true,
        },
      });
    }
    if (currentHistory.rows.length || accountIsActive || meterIsActive)
      throw new Error("ACTIVATION_INCONSISTENT");
    if (meterRow.status !== "ASSIGNED") throw new Error("METER_NOT_ASSIGNABLE");

    await client.query(
      `UPDATE service_accounts
          SET connection_status_id=$1,date_connected=$2::date,updated_by=$3,updated_at=CURRENT_TIMESTAMP
        WHERE service_account_id=$4`,
      [activeStatusId, item.installationDate, auth.user.userId, item.serviceAccountId],
    );
    await client.query(
      `UPDATE meters
          SET status='ACTIVE',installation_date=$1::date,updated_by=$2,updated_at=CURRENT_TIMESTAMP
        WHERE meter_id=$3`,
      [item.installationDate, auth.user.userId, item.meterId],
    );
    await client.query(
      `INSERT INTO meter_installations(service_account_id,meter_id,installation_date,removed_date,installation_type,reason,remarks,performed_by,created_at)
       VALUES($1,$2,$3::date,NULL,'INITIAL','Initial service installation',$4,$5,CURRENT_TIMESTAMP)`,
      [item.serviceAccountId, item.meterId, item.installationDate, item.remarks || "Initial service activation.", item.installerId],
    );
    await client.query("COMMIT");
    return Response.json({
      success: true,
      alreadyActivated: false,
      data: {
        installationId: item.installationId,
        serviceAccountId: item.serviceAccountId,
        meterId: item.meterId,
        installationDate: item.installationDate,
        serviceStatus: "ACTIVE",
        meterStatus: "ACTIVE",
        meterInstallationCreated: true,
        alreadyActivated: false,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = error instanceof Error ? error.message : "";
    const known: Record<string, [string, number]> = {
      ACTIVE_STATUS_MISSING: ["An active connection status is not configured.", 409],
      ACCOUNT_NOT_FOUND: ["The service account is unavailable.", 404],
      METER_NOT_FOUND: ["The assigned meter is unavailable.", 404],
      METER_ACCOUNT_MISMATCH: ["The assigned meter belongs to another service account.", 400],
      METER_NOT_ASSIGNABLE: ["Only an assigned meter can be activated.", 400],
      ACTIVATION_INCONSISTENT: ["Existing activation data is inconsistent. No changes were made.", 409],
    };
    if (known[code]) return fail(...known[code]);
    console.error("Unable to activate service installation:", error);
    return fail("Unable to activate the service installation.", 500);
  } finally {
    client.release();
  }
}
