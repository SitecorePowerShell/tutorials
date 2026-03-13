import { useState } from "react";
import { colors, gradients, fonts, fontSizes, fontSizesMobile, type ThemeMode } from "../theme";

interface LandingPageProps {
  onGetStarted: () => void;
  isMobile: boolean;
  themeMode: ThemeMode;
  onThemeToggle: () => void;
}

const features = [
  { icon: ">_", label: "Hands-on Console", desc: "Practice SPE commands in a simulated console" },
  { icon: "\u25E2", label: "Real Sitecore Tree", desc: "Navigate a virtual content tree" },
  { icon: "\u25B6", label: "23 Guided Lessons", desc: "From basics to advanced scripting" },
  { icon: "\u2601", label: "No Setup Required", desc: "Everything runs in the browser" },
];

export function LandingPage({ onGetStarted, isMobile, themeMode, onThemeToggle }: LandingPageProps) {
  const [ctaHover, setCtaHover] = useState(false);
  const fs = isMobile ? fontSizesMobile : fontSizes;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "24px 20px" : "40px 32px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "auto",
      }}
    >
      {/* Theme toggle */}
      <button
        onClick={onThemeToggle}
        aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} theme`}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: colors.bgCard,
          border: `1px solid ${colors.borderBase}`,
          borderRadius: 8,
          color: colors.textSecondary,
          fontSize: 18,
          cursor: "pointer",
          padding: "8px 12px",
          minWidth: 44,
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {themeMode === "dark" ? "\u2600" : "\u263E"}
      </button>

      {/* Hero content */}
      <div
        style={{
          maxWidth: 720,
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: isMobile ? 20 : 28,
        }}
      >
        {/* Title */}
        <div>
          <h1
            style={{
              fontFamily: fonts.mono,
              fontSize: isMobile ? 22 : 32,
              fontWeight: 600,
              color: colors.accentTitle,
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Sitecore PowerShell Extensions
          </h1>
          <div
            style={{
              fontSize: isMobile ? 16 : 20,
              fontWeight: 500,
              color: colors.textPrimary,
              marginTop: 8,
              fontFamily: fonts.sans,
            }}
          >
            Interactive Tutorial
          </div>
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: fs.lg,
            color: colors.textSecondary,
            margin: 0,
            lineHeight: 1.6,
            maxWidth: 520,
          }}
        >
          Learn to harness the power of PowerShell in Sitecore &mdash; right in your browser.
        </p>

        {/* Credits */}
        <p
          style={{
            fontSize: fs.sm,
            color: colors.textMuted,
            margin: 0,
          }}
        >
          Created by{" "}
          <a
            href="https://github.com/michaellwest"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.accentLink, textDecoration: "none" }}
          >
            Michael West
          </a>
          {" and "}
          <a
            href="https://blog.najmanowicz.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.accentLink, textDecoration: "none" }}
          >
            Adam Najmanowicz
          </a>
        </p>

        {/* Feature cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: isMobile ? 10 : 14,
            width: "100%",
            marginTop: 4,
          }}
        >
          {features.map((f) => (
            <div
              key={f.label}
              style={{
                background: colors.bgCard,
                border: `1px solid ${colors.borderBase}`,
                borderRadius: 8,
                padding: isMobile ? "12px 16px" : "16px 20px",
                textAlign: "left",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 16,
                  color: colors.accentPrimary,
                  flexShrink: 0,
                  marginTop: 2,
                  width: 24,
                  textAlign: "center",
                }}
              >
                {f.icon}
              </span>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: fs.body,
                    color: colors.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontSize: fs.sm,
                    color: colors.textMuted,
                    lineHeight: 1.4,
                  }}
                >
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={onGetStarted}
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          style={{
            background: gradients.accent,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: isMobile ? "14px 36px" : "14px 48px",
            fontSize: isMobile ? 16 : 18,
            fontWeight: 600,
            fontFamily: fonts.sans,
            cursor: "pointer",
            marginTop: 8,
            minWidth: 44,
            minHeight: 44,
            opacity: ctaHover ? 0.9 : 1,
            transform: ctaHover ? "translateY(-1px)" : "none",
            transition: "opacity 0.15s, transform 0.15s",
          }}
        >
          Get Started
        </button>

        {/* Footer links */}
        <div
          style={{
            fontSize: fs.xs,
            color: colors.textMuted,
            marginTop: 12,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <a
            href="https://www.sitecorepowershell.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.textDimmed, textDecoration: "none" }}
          >
            sitecorepowershell.com
          </a>
          <a
            href="https://doc.sitecorepowershell.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.textDimmed, textDecoration: "none" }}
          >
            doc.sitecorepowershell.com
          </a>
        </div>
      </div>
    </div>
  );
}
