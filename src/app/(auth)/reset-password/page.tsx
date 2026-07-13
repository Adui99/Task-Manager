import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <ResetPasswordForm token={token} />
    </div>
  );
}
