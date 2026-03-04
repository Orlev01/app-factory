export default function ProtectedLoading() {
  return (
    <div className="container mx-auto px-4 py-8 flex min-h-[50vh] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );
}
