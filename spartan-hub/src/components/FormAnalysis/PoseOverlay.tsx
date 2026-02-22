import React, { useRef, useEffect } from 'react';
import { Pose, FormAnalysisResult } from '../../types/formAnalysis';

interface PoseOverlayProps {
    pose: Pose | null;
    result?: FormAnalysisResult | null;
    width: number;
    height: number;
    color?: string;
}

const PoseOverlay: React.FC<PoseOverlayProps> = ({ pose, result, width, height, color = '#ffd700' }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        if (!pose) return;

        // Optimization: Batch drawing operations
        ctx.save();


        // Determine dynamic color based on results
        let drawColor = color;
        if (result) {
            if (result.warnings.length > 0) {
                drawColor = result.formScore > 60 ? '#ffae00' : '#ff4444';
            } else if (result.formScore > 80) {
                drawColor = '#00ff88';
            }
        }

        // Draw lines (Skeleton)
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 0; // Reset shadow for lines

        const connections = [
            [11, 12], [11, 23], [12, 24], [23, 24], // Shoulders and hips
            [11, 13], [13, 15], [12, 14], [14, 16], // Arms
            [23, 25], [25, 27], [24, 26], [26, 28], // Legs
            [27, 29], [29, 31], [27, 31],           // Left foot
            [28, 30], [30, 32], [28, 32]            // Right foot
        ];

        connections.forEach(([i, j]) => {
            const p1 = pose.keypoints[i];
            const p2 = pose.keypoints[j];
            if (p1 && p2 && p1.score > 0.5 && p2.score > 0.5) {
                ctx.beginPath();
                ctx.moveTo(p1.x * width, p1.y * height);
                ctx.lineTo(p2.x * width, p2.y * height);
                ctx.stroke();
            }
        });

        // Draw dots (Joints)
        pose.keypoints.forEach((kp: any) => {
            if (kp.score > 0.5) {
                ctx.fillStyle = drawColor;
                ctx.beginPath();
                ctx.arc(kp.x * width, kp.y * height, 4, 0, 2 * Math.PI);
                ctx.fill();

                // Glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = drawColor;
            }
        });

        // AR Angle Overlay Logic
        if (result && result.angles) {
            ctx.shadowBlur = 0; // Disable shadow for text/arcs
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';

            Object.entries(result.angles).forEach(([joint, angle]) => {
                let kpIndex = -1;
                // Map logical joints to keypoint indices
                if (joint === 'knee') kpIndex = 25; // Left knee
                if (joint === 'hip') kpIndex = 23;  // Left hip
                if (joint === 'elbow') kpIndex = 13; // Left elbow
                if (joint === 'back') kpIndex = 23;  // Back angle usually at hip

                if (kpIndex !== -1) {
                    const kp = pose.keypoints[kpIndex];
                    if (kp && kp.score > 0.5) {
                        const x = kp.x * width;
                        const y = kp.y * height;

                        // Draw background for text
                        ctx.fillStyle = 'rgba(0,0,0,0.6)';
                        const text = `${Math.round(angle)}°`;
                        const textWidth = ctx.measureText(text).width;
                        ctx.fillRect(x - textWidth/2 - 4, y - 25, textWidth + 8, 18);

                        // Draw angle text
                        ctx.fillStyle = drawColor;
                        ctx.fillText(text, x, y - 12);

                        // Optional: Draw arc around joint
                        ctx.beginPath();
                        ctx.strokeStyle = drawColor;
                        ctx.lineWidth = 2;
                        ctx.arc(x, y, 20, 0, (angle * Math.PI) / 180);
                        ctx.stroke();
                    }
                }
            });
        }
        
        ctx.restore();

    }, [pose, result, width, height, color]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="absolute top-0 left-0 pointer-events-none z-10"
        />
    );
};

export default PoseOverlay;
