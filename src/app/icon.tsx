import { ImageResponse } from "next/og";

// Browser-tab favicon, generated from the same mark as the header logo
// (src/components/shell/Brand.tsx) so the two stay in sync.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#5f8460",
          borderRadius: "58% 42% 63% 37% / 46% 55% 45% 54%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbfaf4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8.5 9.3C8.5 6.1 9.9 4 12 4s3.5 2.1 3.5 5.3" />
          <path d="M5.3 9.3h13.4l-1.7 9.2a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6z" />
          <path d="M6.6 12.6h10.8" />
          <path d="M7.3 15.9h9.4" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
