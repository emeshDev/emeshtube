import React from "react";

const layout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div>
      <div className="p-4 bg-rose-500 w-full">Navbar</div>
      <div>{children}</div>
    </div>
  );
};

export default layout;
