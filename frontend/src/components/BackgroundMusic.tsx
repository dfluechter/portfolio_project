import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";

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
    const [volume, setVolume] = useState(initialVolume);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

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

    const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
        setVolume(Number(event.target.value));
    };

    const renderVolumeIcon = () => {
        if (volume === 0) return <VolumeX className="h-4 w-4 text-neutral-500" />;
        if (volume < 0.5) return <Volume1 className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />;
        return <Volume2 className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />;
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-neutral-200/80 bg-white/80 px-3 py-2 text-neutral-800 shadow-lg backdrop-blur-md transition-all dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-100">
            <audio ref={audioRef} src={src} loop preload="none" />

            <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Hintergrundmusik pausieren" : "Hintergrundmusik abspielen"}
                aria-pressed={isPlaying}
                className="flex items-center gap-2 rounded-full px-1.5 py-0.5 text-sm font-medium transition hover:text-neutral-600 dark:hover:text-neutral-300"
            >
                {isPlaying ? (
                    <Pause className="h-4 w-4 shrink-0" />
                ) : (
                    <Play className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden sm:inline">
                    {isPlaying ? "Musik pausieren" : "Hintergrundmusik"}
                </span>
            </button>

            {isPlaying && (
                <div className="flex items-center gap-1.5 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                    {renderVolumeIcon()}
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={volume}
                        onChange={handleVolumeChange}
                        aria-label="Lautstärke der Hintergrundmusik"
                        className="h-1 w-16 cursor-pointer accent-neutral-800 dark:accent-neutral-200"
                    />
                </div>
            )}
        </div>
    );
}