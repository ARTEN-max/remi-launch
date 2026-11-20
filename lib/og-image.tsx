import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };
export const ogAlt = "Remi — an AI that remembers you for years";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function renderOgImage() {
  const [fraunces, outfit] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/Fraunces-600.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Outfit-500.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F3EDE3",
          color: "#2A2118",
        }}
      >
        <div style={{ width: 28, height: "100%", background: "#C4552A" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 1172,
            height: "100%",
            padding: "68px 76px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "Fraunces", fontSize: 52, letterSpacing: -1 }}>Remi</div>
            <div
              style={{
                display: "flex",
                fontFamily: "Outfit",
                fontSize: 24,
                color: "#9A3E1C",
                border: "2px solid #C4552A",
                padding: "8px 18px",
                borderRadius: 999,
              }}
            >
              Waitlist open
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: 62,
                lineHeight: 1.05,
                letterSpacing: -1.4,
                maxWidth: 980,
              }}
            >
              Most AI forgets you the second you open a new chat.
            </div>
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: 62,
                lineHeight: 1.05,
                color: "#C4552A",
                marginTop: 16,
              }}
            >
              Remi remembers you for years.
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Outfit", fontSize: 28, color: "#5C5146" }}>
            An AI voice that acts like a friend.
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Fraunces", data: toArrayBuffer(fraunces), weight: 600, style: "normal" },
        { name: "Outfit", data: toArrayBuffer(outfit), weight: 500, style: "normal" },
      ],
    },
  );
}

export async function renderMark(size: number) {
  const fraunces = await readFile(join(process.cwd(), "assets/fonts/Fraunces-600.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#C4552A",
          color: "#FBF7F1",
          fontFamily: "Fraunces",
          fontSize: Math.round(size * 0.62),
        }}
      >
        R
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: "Fraunces", data: toArrayBuffer(fraunces), weight: 600, style: "normal" }],
    },
  );
}
