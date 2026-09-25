import React from "react";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-light-ready>{children}</div>;
}
