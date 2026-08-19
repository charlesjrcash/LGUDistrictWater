"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/static-components */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TransactionShell } from "@/modules/transactions/ui/transaction-shell";
import styles from "@/modules/transactions/ui/transactions.module.css";
type Penalty = {
  billPenaltyId: string;
  billId: string;
  billNo: string;
  billingPeriod: string;
  controlNo: string;
  customerName: string;
  penaltyId: string;
  penaltyCode: string;
  penaltyName: string;
  baseAmount: string;
  rate: string;
  amount: string;
  createdAt: string;
  billDate?: string;
  dueDate?: string | null;
  billStatus?: string;
  serviceAccountId?: string;
  penaltyType?: string;
  penaltyDescription?: string | null;
};
const money = (value: string | null | undefined) =>
  Number(value || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
  });
const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
    : "—";
function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(url, { cache: "no-store" }),
        body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setData(body.data);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load bill penalties.",
      );
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, error, loading, load };
}
export function BillPenaltiesPage() {
  const [search, setSearch] = useState("");
  const { data, error, loading, load } = useData<Penalty[]>(
    `/api/bill-penalties?search=${encodeURIComponent(search)}`,
  );
  const total = data?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  return (
    <TransactionShell>
      <div className={styles.headingRow}>
        <div>
          <div className={styles.eyebrow}>Billing Operations</div>
          <h1 className={styles.title}>Bill Penalties</h1>
          <p className={styles.subtitle}>
            Review preserved penalty calculations applied to bills.
          </p>
        </div>
        <Link className={styles.secondaryButton} href="/transactions/bills">
          Bills
        </Link>
      </div>
      <section className={styles.panel}>
        <div className={styles.filters}>
          <input
            className={styles.input}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Bill no., control no., customer, or penalty..."
          />
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <Failure message={error} retry={load} />
        ) : !data?.length ? (
          <div className={styles.empty}>
            <h2>No bill penalties found.</h2>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {[
                      "Bill No.",
                      "Billing Period",
                      "Control No.",
                      "Penalty",
                      "Base Amount",
                      "Rate",
                      "Penalty Amount",
                      "Created At",
                      "Actions",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.billPenaltyId}>
                      <td>{item.billNo}</td>
                      <td>{item.billingPeriod}</td>
                      <td>{item.controlNo}</td>
                      <td>{item.penaltyName}</td>
                      <td>{money(item.baseAmount)}</td>
                      <td>{item.rate}%</td>
                      <td className={styles.strong}>{money(item.amount)}</td>
                      <td>{date(item.createdAt)}</td>
                      <td>
                        <Link
                          className={styles.viewLink}
                          href={`/transactions/bill-penalties/${item.billPenaltyId}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.formActions}>
              <strong>Total displayed penalty: {money(String(total))}</strong>
            </div>
          </>
        )}
      </section>
    </TransactionShell>
  );
}
export function BillPenaltyRecord({
  billPenaltyId,
}: {
  billPenaltyId: string;
}) {
  const { data, error, loading, load } = useData<Penalty>(
    `/api/bill-penalties/${encodeURIComponent(billPenaltyId)}`,
  );
  if (loading)
    return (
      <TransactionShell>
        <Loading />
      </TransactionShell>
    );
  if (!data)
    return (
      <TransactionShell>
        <Link className={styles.backLink} href="/transactions/bill-penalties">
          ← Bill Penalties
        </Link>
        <Failure message={error} retry={load} />
      </TransactionShell>
    );
  const Card = ({
    title,
    rows,
  }: {
    title: string;
    rows: [string, string][];
  }) => (
    <section className={styles.detailCard}>
      <div className={styles.cardHeading}>
        <h2>{title}</h2>
      </div>
      <div className={styles.detailItems}>
        {rows.map(([label, value]) => (
          <div className={styles.detailItem} key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
  return (
    <TransactionShell>
      <Link className={styles.backLink} href="/transactions/bill-penalties">
        ← Bill Penalties
      </Link>
      <header className={styles.detailHeader}>
        <div>
          <h1>Bill Penalty #{data.billPenaltyId}</h1>
          <p className={styles.detailCustomer}>
            {data.billNo}
            <span>
              {data.controlNo} · {data.customerName}
            </span>
          </p>
        </div>
        <Link
          className={styles.secondaryButton}
          href={`/transactions/bills/${encodeURIComponent(data.billNo)}`}
        >
          View Bill
        </Link>
      </header>
      <div className={styles.detailGrid}>
        <div>
          <Card
            title="Bill Information"
            rows={[
              ["Bill No.", data.billNo],
              ["Billing Period", data.billingPeriod],
              ["Bill Date", date(data.billDate)],
              ["Due Date", date(data.dueDate)],
              ["Status", data.billStatus || "—"],
            ]}
          />
          <Card
            title="Customer / Account Information"
            rows={[
              ["Control No.", data.controlNo],
              ["Service Account", data.serviceAccountId || "—"],
            ]}
          />
          <Card
            title="Penalty Information"
            rows={[
              ["Penalty", data.penaltyName],
              ["Type", data.penaltyType || "—"],
              ["Description", data.penaltyDescription || "—"],
              ["Base Amount", money(data.baseAmount)],
              ["Applied Rate", `${data.rate}%`],
              ["Penalty Amount", money(data.amount)],
              ["Created At", date(data.createdAt)],
            ]}
          />
        </div>
      </div>
    </TransactionShell>
  );
}
function Loading() {
  return (
    <div className={styles.loading}>
      <div className={styles.skeleton} style={{ height: 180 }} />
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className={`${styles.panel} ${styles.errorState}`}>
      <h2>Bill penalties unavailable</h2>
      <p>{message}</p>
      <button className={styles.secondaryButton} onClick={retry}>
        Try again
      </button>
    </div>
  );
}
