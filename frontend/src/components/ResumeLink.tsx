import { useState } from "react";
import { downloadResume, viewResume } from "../api/api";
import { DownloadIcon, EyeIcon } from "./Icons";

interface Props {
  resumeFileName: string;
  resumeOriginalName: string;
}

export default function ResumeLink({ resumeFileName, resumeOriginalName }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"view" | "download" | null>(null);

  async function handleView() {
    setError("");
    setBusy("view");
    try {
      await viewResume(resumeFileName);
    } catch {
      setError("Couldn't open the resume. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDownload() {
    setError("");
    setBusy("download");
    try {
      await downloadResume(resumeFileName, resumeOriginalName);
    } catch {
      setError("Couldn't download the resume. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <span className="resume-link">
      <button type="button" className="link-btn" onClick={handleView} disabled={busy !== null} title={resumeOriginalName}>
        <EyeIcon />
        {busy === "view" ? "Opening..." : "View resume"}
      </button>
      <button type="button" className="link-btn" onClick={handleDownload} disabled={busy !== null}>
        <DownloadIcon />
        {busy === "download" ? "Downloading..." : "Download"}
      </button>
      {error && <span className="error-text">{error}</span>}
    </span>
  );
}
