"use client";

import { FormEvent, useEffect, useState } from "react";

const inputClass =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const labelClass = "block text-sm font-semibold text-slate-800";

type RegistrationEmployee = {
  employee_id: number;
  employee_code: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  employee_name: string;
  position: string | null;
  contact_no: string | null;
  email: string | null;
  is_active: boolean;
};

type RegistrationFormProps = {
  initialRoles: string[];
  initialEmployees: RegistrationEmployee[];
};

export default function RegistrationForm({
  initialRoles,
  initialEmployees,
}: RegistrationFormProps) {
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState("");

  useEffect(() => {
    if (!status) return;

    const dismissTimer = window.setTimeout(
      () => setStatus(null),
      15000
    );

    return () => window.clearTimeout(dismissTimer);
  }, [status]);

  const selectedEmployee = initialEmployees.find(
    (employee) =>
      String(employee.employee_id) === selectedEmployeeId
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setStatus(null);
    setSubmitting(true);

    const form = event.currentTarget;

    try {
      const formData = new FormData(form);

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          Object.fromEntries(formData)
        ),
      });

      const result = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to create user."
        );
      }

      form.reset();

      setSelectedEmployeeId("");

      setShowPassword(false);

      setShowConfirmPassword(false);

      setStatus({
        type: "success",
        message:
          result.message ||
          "User created successfully.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create user.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >

      {/* HEADER */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:px-8">
        <div className="flex items-start gap-3">

          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white shadow-sm"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
            >
              <circle
                cx="12"
                cy="8"
                r="3.25"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 21a7 7 0 0 1 14 0"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900">
              User Registration
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a system account for an existing employee.
            </p>
          </div>

        </div>
      </div>

      <div className="space-y-8 px-6 py-7 sm:px-8 sm:py-8">

        {/* EMPLOYEE SECTION */}
        <section aria-labelledby="employee-heading">

          <div className="mb-5">
            <h3
              id="employee-heading"
              className="text-sm font-bold text-slate-900"
            >
              Employee
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Select the employee who will use this system account.
            </p>
          </div>

          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">

            {/* Employee */}
            <label className={labelClass}>
              Employee{" "}
              <span className="text-red-600">*</span>

              <select
                className={inputClass}
                name="employeeId"
                required
                value={selectedEmployeeId}
                onChange={(event) =>
                  setSelectedEmployeeId(
                    event.target.value
                  )
                }
              >
                <option value="" disabled>
                  Select an employee
                </option>

                {initialEmployees.map(
                  (employee) => (
                    <option
                      key={employee.employee_id}
                      value={employee.employee_id}
                    >
                      {employee.employee_code} —{" "}
                      {employee.employee_name}
                    </option>
                  )
                )}
              </select>
            </label>

            {/* Employee Code */}
            <label className={labelClass}>
              Employee Code

              <input
                className={inputClass}
                value={
                  selectedEmployee?.employee_code ||
                  ""
                }
                readOnly
                tabIndex={-1}
                placeholder="Employee code"
              />
            </label>

            {/* Position */}
            <label className={labelClass}>
              Position

              <input
                className={inputClass}
                value={
                  selectedEmployee?.position ||
                  ""
                }
                readOnly
                tabIndex={-1}
                placeholder="Employee position"
              />
            </label>

            {/* Email */}
            <label className={labelClass}>
              Employee Email

              <input
                className={inputClass}
                value={
                  selectedEmployee?.email ||
                  ""
                }
                readOnly
                tabIndex={-1}
                placeholder="Employee email"
              />
            </label>

            {/* Contact */}
            <label className={labelClass}>
              Contact Number

              <input
                className={inputClass}
                value={
                  selectedEmployee?.contact_no ||
                  ""
                }
                readOnly
                tabIndex={-1}
                placeholder="Contact number"
              />
            </label>

          </div>
        </section>

        {/* ACCOUNT SECTION */}
        <section
          aria-labelledby="identity-heading"
          className="border-t border-slate-200 pt-7"
        >

          <div className="mb-5">
            <h3
              id="identity-heading"
              className="text-sm font-bold text-slate-900"
            >
              System Account
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Assign the employee's username and system access role.
            </p>
          </div>

          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">

            {/* Username */}
            <label className={labelClass}>
              Username{" "}
              <span className="text-red-600">*</span>

              <input
                className={inputClass}
                name="username"
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                placeholder="e.g. juan.delacruz"
              />
            </label>

            {/* Role */}
            <label className={labelClass}>
              System role{" "}
              <span className="text-red-600">*</span>

              <select
                className={inputClass}
                name="role"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Select a role
                </option>

                {initialRoles.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {role}
                    </option>
                  )
                )}
              </select>

              <span className="mt-1.5 block text-xs font-normal text-slate-500">
                Sets this user's access level.
              </span>
            </label>

          </div>
        </section>

        {/* PASSWORD SECTION */}
        <section
          aria-labelledby="access-heading"
          className="border-t border-slate-200 pt-7"
        >

          <div className="mb-5">
            <h3
              id="access-heading"
              className="text-sm font-bold text-slate-900"
            >
              Account Access
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create a temporary password that expires in
              24 hours and must be changed at first sign-in.
            </p>
          </div>

          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">

            {/* Password */}
            <label className={labelClass}>
              Temporary password{" "}
              <span className="text-red-600">*</span>

              <span className="relative mt-2 block">

                <input
                  className={`${inputClass} mt-0 pr-11`}
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (visible) => !visible
                    )
                  }
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? "◉" : "○"}
                </button>

              </span>

              <span className="mt-1.5 block text-xs font-normal text-slate-500">
                Use 8 or more characters. It will expire after 24 hours.
              </span>
            </label>

            {/* Confirm Password */}
            <label className={labelClass}>
              Confirm temporary password{" "}
              <span className="text-red-600">*</span>

              <span className="relative mt-2 block">

                <input
                  className={`${inputClass} mt-0 pr-11`}
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (visible) => !visible
                    )
                  }
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={
                    showConfirmPassword
                  }
                >
                  {showConfirmPassword ? "◉" : "○"}
                </button>

              </span>
            </label>

          </div>
        </section>

      </div>

      {/* FOOTER */}
      <div className="flex flex-col-reverse gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">

        <p className="flex items-center gap-2 text-xs leading-5 text-slate-500">

          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-4 shrink-0"
            aria-hidden="true"
          >
            <rect
              x="5"
              y="10"
              width="14"
              height="10"
              rx="2"
            />

            <path
              strokeLinecap="round"
              d="M8 10V7a4 4 0 0 1 8 0v3"
            />
          </svg>

          Account details are securely stored.

        </p>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && (
            <span
              className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}

          {submitting
            ? "Creating user..."
            : "Create user"}
        </button>

      </div>

      {/* STATUS MESSAGE */}
      {status && (
        <div
          role={
            status.type === "error"
              ? "alert"
              : "status"
          }
          aria-live={
            status.type === "error"
              ? "assertive"
              : "polite"
          }
          className={`fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg sm:right-6 sm:top-6 ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >

          <span
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-sm font-bold"
            aria-hidden="true"
          >
            {status.type === "success"
              ? "✓"
              : "!"}
          </span>

          <p className="min-w-0 flex-1 text-sm font-medium leading-6">
            {status.message}
          </p>

          <button
            type="button"
            onClick={() => setStatus(null)}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-current/70 transition hover:bg-black/5 hover:text-current focus:outline-none focus:ring-2 focus:ring-current/30"
            aria-label="Dismiss notification"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                d="m6 6 12 12M18 6 6 18"
              />
            </svg>
          </button>

        </div>
      )}

    </form>
  );
}