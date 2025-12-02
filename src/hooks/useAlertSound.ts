import { useState, useEffect, useRef, useCallback } from "react";

export const useAlertSound = (isAlert: boolean) => {
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem("alertMuted");
        return saved === "true";
    });

    const audioContextRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const isPlayingRef = useRef(false);

    const createAlarmSound = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
        }

        const ctx = audioContextRef.current;

        // Create oscillator for alarm tone
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);

        // Create pulsing effect
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillatorRef.current = oscillator;
        gainNodeRef.current = gainNode;

        return { oscillator, gainNode };
    }, []);

    const startAlarm = useCallback(() => {
        if (isPlayingRef.current || isMuted) return;

        const { oscillator, gainNode } = createAlarmSound();
        const ctx = audioContextRef.current!;

        oscillator.start();
        isPlayingRef.current = true;

        // Create pulsing pattern
        const pulseInterval = setInterval(() => {
            if (!isPlayingRef.current) {
                clearInterval(pulseInterval);
                return;
            }

            const now = ctx.currentTime;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 1);

            // Alternate frequency for urgency
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.setValueAtTime(600, now + 0.5);
        }, 1000);

        return () => clearInterval(pulseInterval);
    }, [isMuted, createAlarmSound]);

    const stopAlarm = useCallback(() => {
        if (oscillatorRef.current) {
            try {
                oscillatorRef.current.stop();
            } catch (e) {
                // Oscillator already stopped
            }
            oscillatorRef.current = null;
        }

        isPlayingRef.current = false;
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            const newValue = !prev;
            localStorage.setItem("alertMuted", String(newValue));

            if (newValue) {
                stopAlarm();
            }

            return newValue;
        });
    }, [stopAlarm]);

    // Handle alert state changes
    useEffect(() => {
        if (isAlert && !isMuted) {
            startAlarm();
        } else {
            stopAlarm();
        }

        return () => {
            stopAlarm();
        };
    }, [isAlert, isMuted, startAlarm, stopAlarm]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopAlarm();

            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [stopAlarm]);

    return {
        isMuted,
        toggleMute
    };
};
