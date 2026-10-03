import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { colors, s } from "./ui";

type RecognitionEvent = { results: ArrayLike<{ 0: { transcript: string } }>; resultIndex: number };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => Recognition;
type VoiceCallProps = {
  active?: boolean;
  assistantText?: string;
  replying: boolean;
  onTranscript: (text: string) => void;
};

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const candidate = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return candidate.SpeechRecognition || candidate.webkitSpeechRecognition;
}

export function VoiceCall({
  active = true,
  assistantText,
  replying,
  onTranscript,
}: VoiceCallProps) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("Fale com o Whilo");
  const recognition = useRef<Recognition | undefined>(undefined);
  const shouldContinue = useRef(false);
  const activeRef = useRef(active);
  const openRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const spoken = useRef("");

  useEffect(() => {
    activeRef.current = active;
    if (active) return;
    shouldContinue.current = false;
    openRef.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    recognition.current?.stop();
    setListening(false);
    setOpen(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
  }, [active]);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (!open || replying || !assistantText || assistantText === spoken.current || !active) return;
    const timer = setTimeout(() => {
      if (
        !activeRef.current ||
        !openRef.current ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      )
        return;
      const resumeListening = shouldContinue.current;
      shouldContinue.current = false;
      recognition.current?.stop();
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(assistantText);
      utterance.lang = "pt-BR";
      utterance.rate = 1.04;
      utterance.onend = () => {
        if (!activeRef.current || !openRef.current || !resumeListening) return;
        shouldContinue.current = true;
        startListening();
      };
      window.speechSynthesis.speak(utterance);
      spoken.current = assistantText;
      setListening(false);
      setStatus("Whilo está respondendo…");
    }, 250);
    return () => clearTimeout(timer);
  }, [active, assistantText, open, replying]);

  useEffect(
    () => () => {
      activeRef.current = false;
      shouldContinue.current = false;
      openRef.current = false;
      if (restartTimer.current) clearTimeout(restartTimer.current);
      recognition.current?.stop();
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    },
    [],
  );

  function stopListening() {
    shouldContinue.current = false;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    recognition.current?.stop();
    setListening(false);
    setStatus("Chamada pausada");
  }

  function startListening() {
    const Constructor = recognitionConstructor();
    if (!activeRef.current || !openRef.current) return;
    if (!Constructor) {
      setStatus("Voice call web requer Chrome, Edge ou Safari");
      return;
    }
    if (!recognition.current) {
      const instance = new Constructor();
      instance.continuous = true;
      instance.interimResults = false;
      instance.lang = "pt-BR";
      instance.onresult = (event) => {
        if (!activeRef.current || !openRef.current || !shouldContinue.current) return;
        const result = event.results[event.resultIndex];
        const text = result?.[0]?.transcript?.trim();
        if (!text) return;
        setStatus("Whilo está trabalhando…");
        onTranscriptRef.current(text);
      };
      instance.onerror = (event) => {
        if (event.error === "not-allowed") {
          shouldContinue.current = false;
          setListening(false);
          setStatus("Permita o microfone para falar");
          return;
        }
        setStatus("Não consegui ouvir; tente novamente");
      };
      instance.onend = () => {
        setListening(false);
        if (!activeRef.current || !openRef.current || !shouldContinue.current) return;
        restartTimer.current = setTimeout(() => {
          restartTimer.current = undefined;
          if (!activeRef.current || !openRef.current || !shouldContinue.current) return;
          try {
            instance.start();
            setListening(true);
          } catch {
            setStatus("Microfone aguardando…");
          }
        }, 160);
      };
      recognition.current = instance;
    }
    shouldContinue.current = true;
    setListening(true);
    setStatus("Ouvindo… diga uma tarefa");
    try {
      recognition.current.start();
    } catch {
      /* browser already running */
    }
  }

  function toggleCall() {
    if (open) {
      stopListening();
      openRef.current = false;
      setOpen(false);
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
      return;
    }
    openRef.current = true;
    setOpen(true);
    startListening();
  }

  return (
    <View style={{ gap: 8, marginBottom: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? "Encerrar voice call" : "Iniciar voice call com Whilo"}
        disabled={!active}
        onPress={toggleCall}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          alignSelf: "flex-start",
          borderRadius: 22,
          paddingHorizontal: 13,
          paddingVertical: 9,
          backgroundColor: open ? "#E6F4FF" : "#F3F6F8",
          opacity: pressed || !active ? 0.55 : 1,
        })}
      >
        {open ? (
          <PhoneOff size={16} color={colors.blueDark} />
        ) : (
          <Phone size={16} color={colors.blueDark} />
        )}
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
          {open ? "Voice call ativa" : "Falar com Whilo"}
        </Text>
        {open &&
          (listening ? (
            <Mic size={15} color={colors.blueDark} />
          ) : (
            <MicOff size={15} color={colors.muted} />
          ))}
      </Pressable>
      {open && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Volume2 size={14} color={colors.muted} />
          <Text style={s.small}>
            {status}. Você pode dizer: “envie este email”, “pesquise uma viagem” ou “prepare esta
            compra”.
          </Text>
        </View>
      )}
    </View>
  );
}
