"use client";
import React, { useEffect } from "react";

const Page = () => {
  useEffect(() => {
    console.log("Client Component");
  }, []);
  return <div>feed page</div>;
};

export default Page;
