"use client";

import { useEffect, useRef, useState } from "react";

interface OpenAPIRendererProps {
  content: string;
  format: "yaml" | "json";
}

export default function OpenAPIRenderer({ content, format }: OpenAPIRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load swagger-ui from CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.async = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(script);
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    if (!loaded || !containerRef.current) return;

    // Parse spec
    let spec: object;
    try {
      if (format === "json") {
        spec = JSON.parse(content);
      } else {
        // For YAML, pass as string - swagger-ui can handle it
        spec = { spec: content } as any;
      }
    } catch {
      return;
    }

    // @ts-ignore - swagger-ui-bundle is loaded from CDN
    window.SwaggerUIBundle({
      spec: format === "json" ? spec : undefined,
      url: format !== "json" ? undefined : undefined,
      domNode: containerRef.current,
      deepLinking: true,
      docExpansion: "list",
      defaultModelsExpandDepth: -1,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true,
      presets: [
        // @ts-ignore
        window.SwaggerUIBundle.presets.apis,
        // @ts-ignore
        window.SwaggerUIBundle.SwaggerUIStandalonePreset,
      ],
      layout: "BaseLayout",
    });
  }, [loaded, content, format]);

  if (!loaded) {
    return (
      <div className="p-4 text-[var(--color-text-muted)]">
        Loading API documentation...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="swagger-container"
      style={{ minHeight: "600px" }}
    />
  );
}
