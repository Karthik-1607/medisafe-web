import React from "react";

export function GlobalBackgroundVideo() {
  return (
    <div className="global-bg-video-container" aria-hidden="true">
      <video
        className="global-bg-video"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/216134_medium.mp4" type="video/mp4" />
      </video>
      <div className="global-bg-video-overlay" />
    </div>
  );
}
