"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import { openapiSpec } from "@/lib/openapi-spec";

export default function ApiDocsPage() {
  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-zinc-50">
        API Docs
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        OpenAPI 3.0 spec for all API endpoints.
      </p>
      <div className="mt-6 rounded-xl bg-white p-4 [&_.swagger-ui]:font-sans">
        <SwaggerUI spec={openapiSpec} />
      </div>
    </div>
  );
}
