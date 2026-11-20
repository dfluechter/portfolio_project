import { useEffect, useRef, useState } from "react";

interface BackgroundMusicProps {
    src?: string;
    initialVolume?: number;
}

export function BackgroundMusic({
    src = "/audio/ambient-bg.mp3",
    initialVolume = 0.25,
}: BackgroundMusicProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = initialVolume;
        }
    }, [initialVolume]);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            try {
                await audio.play();
                setIsPlaying(true);
            } catch (error) {
                console.error("Audio konnte nicht abgespielt werden:", error);
            }
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <audio ref={audioRef} src={src} loop preload="none" />
            <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Hintergrundmusik pausieren" : "Hintergrundmusik abspielen"}
                className="flex items-center gap-2 rounded-full bg-neutral-900/80 px-4 py-2 text-sm text-white shadow-md backdrop-blur transition hover:bg-neutral-800"
            >
                <span>{isPlaying ? "⏸ Musik aus" : "▶ Musik an"}</span>
            </button>
        </div>
    );
}