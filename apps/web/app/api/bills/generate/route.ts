import { db } from "@/lib/db";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";

const fail = (message: string, status: number) =>
  Response.json({ success: false, message }, { status });

type GenerationSummary = {
  validated_count: string | number;
  generated_count: string | number;
  existing_count: string | number;
  no_rate_count: string | number;
  connection_fee_count: string | number;
  previous_balance_count: string | number;
};

export async function POST(request: Request) {
  const auth = await requirePermission("BILL_CREATE");
  if (auth.response) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid request.", 400);
  }

  const billingPeriodId =
    typeof body.billingPeriodId === "string" || typeof body.billingPeriodId === "number"
      ? String(body.billingPeriodId).trim()
      : "";
  if (!/^\d+$/.test(billingPeriodId)) return fail("Select a valid billing period.", 400);

  try {
    const period = await db.query(
      "SELECT billing_period_id FROM mt_billing_period WHERE billing_period_id=$1 AND UPPER(status)='OPEN'",
      [billingPeriodId],
    );
    if (!period.rows[0]) {
      const existing = await db.query(
        "SELECT billing_period_id FROM mt_billing_period WHERE billing_period_id=$1",
        [billingPeriodId],
      );
      return fail(existing.rows[0] ? "Bills can only be generated for an open billing period." : "Billing period not found.", existing.rows[0] ? 409 : 404);
    }

    const result = await db.query<GenerationSummary>(
      "SELECT * FROM public.fn_generate_bills($1::bigint,$2::bigint)",
      [billingPeriodId, auth.user.userId],
    );
    const summary = result.rows[0];
    if (!summary) return fail("Bill generation did not return a summary.", 500);

    return Response.json({
      success: true,
      data: {
        billingPeriodId,
        validatedCount: Number(summary.validated_count),
        generatedCount: Number(summary.generated_count),
        existingCount: Number(summary.existing_count),
        noRateCount: Number(summary.no_rate_count),
        connectionFeeCount: Number(summary.connection_fee_count),
        previousBalanceCount: Number(summary.previous_balance_count),
      },
      message: "Bill generation completed.",
    });
  } catch (error) {
    console.error("Unable to generate bills:", error);
    return fail("Bill generation could not be completed.", 500);
  }
}
