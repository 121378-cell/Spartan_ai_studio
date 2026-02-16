export class VoiceCoachService {
    private static synthesis = window.speechSynthesis;
    private static lastMessage = '';
    private static lastMessageTime = 0;

    static speak(message: string, priority: 'low' | 'high' = 'low') {
        const now = Date.now();

        // Prevent spamming the same message (debounce)
        if (message === this.lastMessage && now - this.lastMessageTime < 5000) {
            return;
        }

        // Low priority messages can wait, high priority cancels current speech
        if (priority === 'high' && this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'es-ES'; // Set to Spanish
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        this.lastMessage = message;
        this.lastMessageTime = now;
        this.synthesis.speak(utterance);
    }

    static silence() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
    }
}
