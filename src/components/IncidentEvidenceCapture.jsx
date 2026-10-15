import { useEffect, useRef, useState } from "react";
import { Camera, CircleStop, ImagePlus, Trash2, Video } from "lucide-react";

const MAX_IMAGES = 3;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function IncidentEvidenceCapture({ files, onFilesChange, disabled = false, onRecordingChange = () => {} }) {
  const [recording, setRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  function addImages(selectedFiles) {
    setError("");
    const images = Array.from(selectedFiles);
    if (files.length + images.length > MAX_IMAGES) {
      setError("You can attach up to three images or videos in total.");
      return;
    }
    const invalid = images.find(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      || file.size <= 0 || file.size > 10 * 1024 * 1024);
    if (invalid) {
      setError("Choose JPEG, PNG, or WebP images up to 10 MB each.");
      return;
    }
    onFilesChange([...files, ...images]);
  }

  async function startRecording() {
    setError("");
    if (files.length >= MAX_IMAGES) {
      setError("You can attach up to three images or videos in total.");
      return;
    }
    if (files.some(file => file.type.startsWith("video/"))) {
      setError("Only one video can be attached to a report.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Live video recording is not supported by this browser. You can still attach a photo.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const mimeType = ["video/webm;codecs=vp8", "video/webm", "video/mp4"]
        .find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("This browser cannot record a supported video format.");

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 900000 });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError("The video recording could not be completed. Please try again.");
        if (recorder.state === "recording") recorder.stop();
      };
      recorder.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setRecording(false);
        onRecordingChange(false);
        const video = new File(chunksRef.current, `incident-${Date.now()}.${mimeType.includes("mp4") ? "mp4" : "webm"}`, {
          type: mimeType.split(";")[0],
        });
        if (video.size > MAX_VIDEO_BYTES) {
          setError("This recording is over the 40 MB limit. Record a shorter clip and try again.");
        } else if (video.size > 0) {
          onFilesChange([...files, video]);
        } else {
          setError("No video was captured. Please try recording again.");
        }
      };
      recorder.start(1000);
      setElapsedSeconds(0);
      setRecording(true);
      onRecordingChange(true);
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        setElapsedSeconds(Math.min(seconds, 120));
        if (seconds >= 120 && recorder.state === "recording") recorder.stop();
      }, 250);
    } catch (captureError) {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setRecording(false);
      onRecordingChange(false);
      setError(captureError.message || "Camera access is unavailable. Allow camera permission and try again.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else onRecordingChange(false);
  }

  function removeFile(index) {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
    setError("");
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 42, padding: "9px 13px", border: "1px solid #C8D0E0", borderRadius: 6, color: "#1A2766", fontSize: 12.5, fontWeight: 600, cursor: disabled || recording ? "not-allowed" : "pointer", opacity: disabled || recording ? 0.55 : 1 }}>
          <ImagePlus size={17} aria-hidden="true" /> Add or capture photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            multiple
            disabled={disabled || recording || files.length >= MAX_IMAGES}
            onChange={event => {
              addImages(event.target.files || []);
              event.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </label>
        {recording ? (
          <button type="button" onClick={stopRecording} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 42, padding: "9px 13px", background: "#B83018", border: 0, borderRadius: 6, color: "#FFFFFF", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            <CircleStop size={17} aria-hidden="true" /> Stop recording · {formatDuration(elapsedSeconds)} / 2:00
          </button>
        ) : (
          <button type="button" onClick={startRecording} disabled={disabled || files.length >= MAX_IMAGES} style={{ display: "inline-flex", alignItems: "center", gap: 7, minHeight: 42, padding: "9px 13px", background: "#FFFFFF", border: "1px solid #C8D0E0", borderRadius: 6, color: "#1A2766", fontSize: 12.5, fontWeight: 600, cursor: disabled || files.length >= MAX_IMAGES ? "not-allowed" : "pointer", opacity: disabled || files.length >= MAX_IMAGES ? 0.55 : 1 }}>
            <Video size={17} aria-hidden="true" /> Record video (max 2 min)
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "#344060", lineHeight: 1.55, margin: "0 0 10px" }}>
        Optional evidence: up to three attachments total, images up to 10 MB and one video up to 40 MB. Stored privately for 90 days and visible only to you, authorized admins, and the assigned responder.
      </p>
      {error && <p role="alert" style={{ fontSize: 12, color: "#B83018", margin: "0 0 8px" }}>{error}</p>}
      {files.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, border: "1px solid #C8D0E0", borderRadius: 5, padding: "7px 9px", fontSize: 12, color: "#0D1526" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0, overflowWrap: "anywhere" }}>
                {file.type.startsWith("video/") ? <Video size={15} aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
                {file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
              <button type="button" aria-label={`Remove ${file.name}`} disabled={disabled || recording} onClick={() => removeFile(index)} style={{ border: 0, background: "transparent", color: "#B83018", cursor: "pointer", padding: 4 }}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
