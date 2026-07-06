"use client";

import React from "react";

type PageShellProps = {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageShell({ title, actions, children }: PageShellProps) {
  return (
    <div className="page page-animate">
      <div className="container">
        <div className="row-between">
          <h1 className="section-title">{title}</h1>
          {actions ? <div className="row">{actions}</div> : null}
        </div>
        <div className="stack-lg">{children}</div>
      </div>
    </div>
  );
}
