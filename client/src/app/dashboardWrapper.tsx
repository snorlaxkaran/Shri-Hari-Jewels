const dashboardWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="bg-zinc-50 text-zinc-900 w-full min-h-screen">
      {children}
    </div>
  );
};

export default dashboardWrapper;
