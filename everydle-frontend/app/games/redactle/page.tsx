"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MoreVertical,
  RotateCcw,
  X,
  HelpCircle,
  Eye,
  EyeOff,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Play,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { markGameCompleted, unmarkGameCompleted, formatDate } from "@/lib/dailyCompletion";
import { triggerDataRefresh } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { markDailyGameCompleted } from "@/app/games/actions";

// Turkish common words (stop words)
const TURKISH_COMMON_WORDS = [
  "bir",
  "bu",
  "ve",
  "ile",
  "için",
  "olan",
  "olan",
  "da",
  "de",
  "ki",
  "mi",
  "mı",
  "mu",
  "mü",
  "veya",
  "ya",
  "ile",
  "gibi",
  "kadar",
  "daha",
  "en",
  "çok",
  "az",
  "var",
  "yok",
  "ise",
  "ise",
  "şu",
  "o",
  "bu",
  "şey",
  "şeyler",
  "şeyi",
  "şeyin",
  "şeyden",
  "şeye",
  "şeyle",
  "şeyde",
  "ile",
  "için",
  "gibi",
  "kadar",
  "daha",
  "en",
  "çok",
  "az",
  "var",
  "yok",
  "ise",
  "olan",
];

const commonWordsDict: Record<string, boolean> = {};
TURKISH_COMMON_WORDS.forEach((w) => {
  commonWordsDict[w.toLowerCase()] = true;
});

// Regex for Turkish characters
const TURKISH_WORD_REGEX =
  /([\u00BF-\u1FFF\u2C00-\uD7FF\w\u0130\u0131\u011E\u011F\u015E\u015F\u00C7\u00E7\u00D6\u00F6\u00DC\u00FC]+)([^\u00BF-\u1FFF\u2C00-\uD7FF\w\u0130\u0131\u011E\u011F\u015E\u015F\u00C7\u00E7\u00D6\u00F6\u00DC\u00FC]*)/gi;

interface Token {
  value: string;
  wordNormal: string;
  id: string;
  redacted: boolean;
  highlight: boolean;
}

interface Section {
  headline: boolean;
  tokens: Token[];
}

// Daily game configuration - games start from 26.11.2025
const REDACTLE_START_DATE = new Date(2025, 10, 26); // Month is 0-indexed, so 10 = November

// Get day number from date (1-indexed)
const getDayNumber = (date: Date): number => {
  const startDate = new Date(REDACTLE_START_DATE);
  startDate.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is 26.11.2025
};

// Format date as DD.MM.YYYY
const formatDateForFile = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Format date for display (Turkish format)
const formatDateDisplay = (date: Date): string => {
  const day = date.getDate();
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];
  return `${day} ${months[date.getMonth()]}`;
};

// Get file path for a specific date
const getFilePath = (date: Date): string => {
  const dayNum = getDayNumber(date);
  const dayStr = dayNum.toString().padStart(3, "0");
  const dateStr = formatDateForFile(date);
  return `/redactle/${dayStr}-${dateStr}.md`;
};

const Redactle = () => {
  const router = useRouter();
  const { backendUserId } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [gameState, setGameState] = useState<{
    urlTitle: string;
    guesses: Record<string, number>;
    revealed?: Record<string, boolean>;
    solved: boolean;
    guessDisplayNames?: Record<string, string>; // Maps normalized -> original display name
    guessOrder?: string[]; // Array tracking guess order (newest first)
  } | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [loading, setLoading] = useState(true);
  const [wordCount, setWordCount] = useState<Record<string, number>>({});
  const [tokenLookup, setTokenLookup] = useState<Record<string, Token[]>>({});
  const [selectedWord, setSelectedWord] = useState("");
  const [message, setMessage] = useState("");
  // Debug toggle: when true, reveal all words (useful for debugging)
  const [debugRevealAll, setDebugRevealAll] = useState(false);
  // Undo stack for guesses snapshots (for simple "Geri Al" behavior)
  const [undoStack, setUndoStack] = useState<
    Array<{
      guesses: Record<string, number>;
      revealed?: Record<string, boolean>;
      guessDisplayNames?: Record<string, string>;
    }>
  >([]);
  // Keys revealed by the last guess (used for blue highlighting)
  const [lastRevealed, setLastRevealed] = useState<Record<string, boolean>>({});
  // ref to the scrollable article container so we can scroll tokens into view
  const articleRef = useRef<HTMLDivElement | null>(null);
  // ref to store timeout IDs so we can clear them when a new word is selected
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const clearHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // remember last scrolled index per word so repeated clicks go to next occurrence
  const [lastScrollIndex, setLastScrollIndex] = useState<
    Record<string, number>
  >({});
  const [showMenu, setShowMenu] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  // Track clicked token to show letter count
  const [clickedTokenId, setClickedTokenId] = useState<string | null>(null);
  // Track which token is currently bouncing
  const [bouncingTokenId, setBouncingTokenId] = useState<string | null>(null);
  // Morphological metadata: root -> lemmas mapping and lemma -> root mapping
  const [rootToLemmas, setRootToLemmas] = useState<Record<string, string[]>>(
    {}
  );
  const [lemmaToRoot, setLemmaToRoot] = useState<Record<string, string>>({});
  // Selected date for the daily game
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  // Show date picker modal
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Store the actual article title from markdown file
  const [articleTitle, setArticleTitle] = useState<string>("");

  // Normalize Turkish text (lowercase, remove accents)
  const normalize = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .trim()
      .split(" ")[0];
  };

  const getMatchingVariants = (guessNorm: string): string[] => {
    if (!tokenLookup) return [];
    const keys = Object.keys(tokenLookup);
    const matches = new Set<string>();

    // First, check exact match - if the word exists in the article
    const exactMatch = keys.includes(guessNorm);
    if (exactMatch) {
      matches.add(guessNorm);
    }

    // Check morphological matching - even if the exact word doesn't exist in article,
    // if it's a root or lemma in metadata, find all related lemmas that DO exist in article

    // Check if the guess is a root word in metadata
    if (rootToLemmas[guessNorm]) {
      // User guessed a root - reveal all lemmas for this root that exist in article
      rootToLemmas[guessNorm].forEach((lemma) => {
        if (keys.includes(lemma)) {
          matches.add(lemma);
        }
      });
    }

    // Check if the guess is a lemma - find its root and reveal all lemmas
    if (lemmaToRoot[guessNorm]) {
      const root = lemmaToRoot[guessNorm];
      if (rootToLemmas[root]) {
        rootToLemmas[root].forEach((lemma) => {
          if (keys.includes(lemma)) {
            matches.add(lemma);
          }
        });
      }
      // Also add the root itself if it exists in the text
      if (keys.includes(root)) {
        matches.add(root);
      }
    }

    // No suffix stripping - we rely only on metadata for morphological matching
    return Array.from(matches);
  };

  // Base64 encode (used for token IDs)
  const base64encode = (str: string): string => {
    const encode = encodeURIComponent(str).replace(
      /%([a-f0-9]{2})/gi,
      (m, $1) => String.fromCharCode(parseInt($1, 16))
    );
    return btoa(encode);
  };

  // Load article from markdown file
  const loadArticle = useCallback(async () => {
    if (!gameState) return;

    setLoading(true);
    try {
      // Load the markdown file for the selected date
      const filePath = getFilePath(selectedDate);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Bu gün için makale bulunamadı (${formatDateDisplay(selectedDate)})`);
      }

      const markdownText = await response.text();
      const allLines = markdownText.split("\n");

      // First line is the title
      const title = allLines[0].trim();
      setArticleTitle(title); // Store the actual article title

      // Find metadata section (starts with --- and contains ```json)
      let contentEndIndex = allLines.length;
      let metadataStartIndex = -1;
      for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].trim() === "---") {
          metadataStartIndex = i;
          break;
        }
      }

      // Extract content (before metadata)
      const content =
        metadataStartIndex > 0
          ? allLines.slice(1, metadataStartIndex).join("\n").trim()
          : allLines.slice(1).join("\n").trim();

      // Parse metadata if exists
      if (metadataStartIndex > 0) {
        const metadataLines = allLines.slice(metadataStartIndex + 1).join("\n");
        // Extract JSON from ```json ... ``` block
        // Match: ```json followed by lemmas = [...] followed by ```
        const jsonBlockMatch = metadataLines.match(
          /```json\s*([\s\S]*?)\s*```/
        );
        if (jsonBlockMatch) {
          try {
            // Extract the array part from "lemmas = [...]"
            const arrayMatch = jsonBlockMatch[1].match(
              /lemmas\s*=\s*(\[[\s\S]*\])/
            );
            if (arrayMatch) {
              const lemmasData = JSON.parse(arrayMatch[1]);
              const rootMap: Record<string, string[]> = {};
              const lemmaMap: Record<string, string> = {};

              lemmasData.forEach((item: { root: string; lemmas: string[] }) => {
                const rootNormalized = normalize(item.root);
                const normalizedLemmas = item.lemmas.map((l) => normalize(l));
                rootMap[rootNormalized] = normalizedLemmas;
                // Map each lemma to its root
                item.lemmas.forEach((lemma) => {
                  lemmaMap[normalize(lemma)] = rootNormalized;
                });
                // Also map root to itself
                lemmaMap[rootNormalized] = rootNormalized;
              });

              setRootToLemmas(rootMap);
              setLemmaToRoot(lemmaMap);
            }
          } catch (e) {
            console.error("Error parsing morphological metadata:", e);
          }
        }
      }

      const newSections: Section[] = [];
      const newWordCount: Record<string, number> = {};
      const newTokenLookup: Record<string, Token[]> = {};

      // Add title as headline
      const titleMatches = [...title.matchAll(TURKISH_WORD_REGEX)];
      const titleTokens = getTokens(
        titleMatches,
        newWordCount,
        newTokenLookup,
        true
      );
      newSections.push({ headline: true, tokens: titleTokens });

      // Process content - handle markdown formatting
      const contentLines = content.split("\n");
      let currentParagraph: string[] = [];

      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i].trim();

        // Empty line - end current paragraph
        if (!line) {
          if (currentParagraph.length > 0) {
            const paraText = currentParagraph.join(" ");
            const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(
              textMatches,
              newWordCount,
              newTokenLookup,
              false
            );
            if (textTokens.length > 0) {
              newSections.push({ headline: false, tokens: textTokens });
            }
            currentParagraph = [];
          }
          continue;
        }

        // Markdown headers (##, ###, etc.)
        if (line.startsWith("##")) {
          // End current paragraph if exists
          if (currentParagraph.length > 0) {
            const paraText = currentParagraph.join(" ");
            const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(
              textMatches,
              newWordCount,
              newTokenLookup,
              false
            );
            if (textTokens.length > 0) {
              newSections.push({ headline: false, tokens: textTokens });
            }
            currentParagraph = [];
          }

          // Extract header text (remove # and spaces)
          const headerText = line.replace(/^#+\s*/, "");
          const headerMatches = [...headerText.matchAll(TURKISH_WORD_REGEX)];
          const headerTokens = getTokens(
            headerMatches,
            newWordCount,
            newTokenLookup,
            true
          );
          if (headerTokens.length > 0) {
            newSections.push({ headline: true, tokens: headerTokens });
          }
          continue;
        }

        // List items (starting with - or *)
        if (line.startsWith("- ") || line.startsWith("* ")) {
          // End current paragraph if exists
          if (currentParagraph.length > 0) {
            const paraText = currentParagraph.join(" ");
            const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
            const textTokens = getTokens(
              textMatches,
              newWordCount,
              newTokenLookup,
              false
            );
            if (textTokens.length > 0) {
              newSections.push({ headline: false, tokens: textTokens });
            }
            currentParagraph = [];
          }

          // Process list item (remove - or *)
          const listText = line.replace(/^[-*]\s+/, "");
          const listMatches = [...listText.matchAll(TURKISH_WORD_REGEX)];
          const listTokens = getTokens(
            listMatches,
            newWordCount,
            newTokenLookup,
            false
          );
          if (listTokens.length > 0) {
            // Add bullet point as a token
            listTokens.unshift({
              value: "• ",
              wordNormal: "",
              id: "",
              redacted: false,
              highlight: false,
            });
            newSections.push({ headline: false, tokens: listTokens });
          }
          continue;
        }

        // Regular text line - add to current paragraph
        currentParagraph.push(line);
      }

      // Process remaining paragraph
      if (currentParagraph.length > 0) {
        const paraText = currentParagraph.join(" ");
        const textMatches = [...paraText.matchAll(TURKISH_WORD_REGEX)];
        const textTokens = getTokens(
          textMatches,
          newWordCount,
          newTokenLookup,
          false
        );
        if (textTokens.length > 0) {
          newSections.push({ headline: false, tokens: textTokens });
        }
      }

      setSections(newSections);
      setWordCount(newWordCount);
      setTokenLookup(newTokenLookup);
      renderTokens(newSections, newWordCount, newTokenLookup);
    } catch (error) {
      console.error("Error loading article:", error);
      setMessage(
        error instanceof Error
          ? `Hata: ${error.message}`
          : "Makale yüklenirken hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }, [gameState, selectedDate]);

  // Get tokens from matches
  const getTokens = (
    matches: RegExpMatchArray[],
    wordCount: Record<string, number>,
    tokenLookup: Record<string, Token[]>,
    isTitle: boolean
  ): Token[] => {
    const tokens: Token[] = [];
    for (const match of matches) {
      const word = match[1];
      if (word) {
        const wordNormal = normalize(word);
        wordCount[wordNormal] = (wordCount[wordNormal] || 0) + 1;
        const token: Token = {
          value: word,
          wordNormal,
          id: `${base64encode(wordNormal).replace(/=/g, "a")}${
            wordCount[wordNormal] - 1
          }`,
          redacted: shouldRedact(wordNormal),
          highlight: wordNormal === selectedWord,
        };
        if (!tokenLookup[wordNormal]) {
          tokenLookup[wordNormal] = [];
        }
        tokenLookup[wordNormal].push(token);
        tokens.push(token);
      }
      if (match[2]) {
        tokens.push({
          value: match[2],
          wordNormal: "",
          id: "",
          redacted: false,
          highlight: false,
        });
      }
    }
    return tokens;
  };

  // Check if word should be redacted
  // Decide whether a normalized word should be redacted.
  // Accepts optional overrides so callers can pass an updated `guesses` or `solved` state
  // (useful when updating `gameState` and re-rendering immediately).
  const shouldRedact = (
    wordNormal: string,
    debugOverride?: boolean,
    guessesOverride?: Record<string, number>,
    revealedOverride?: Record<string, boolean>,
    solvedOverride?: boolean
  ): boolean => {
    const debug = debugOverride !== undefined ? debugOverride : debugRevealAll;
    if (debug) return false;
    const gState =
      guessesOverride !== undefined ||
      revealedOverride !== undefined ||
      solvedOverride !== undefined
        ? {
            guesses: guessesOverride || {},
            revealed: revealedOverride || {},
            solved: !!solvedOverride,
          }
        : gameState;
    if (!gState) return true;
    if ((gState as any).solved) return false;
    if (commonWordsDict[wordNormal]) return false;
    // If the word was directly guessed or if it was revealed as part of a matched variant
    if (
      (gState as any).guesses &&
      (gState as any).guesses[wordNormal] !== undefined
    )
      return false;
    if ((gState as any).revealed && (gState as any).revealed[wordNormal])
      return false;
    return true;
  };

  // Render tokens with current state
  const renderTokens = (
    sectionsToRender: Section[],
    wordCountToUse: Record<string, number>,
    tokenLookupToUse: Record<string, Token[]>,
    debugOverride?: boolean,
    guessesOverride?: Record<string, number>,
    revealedOverride?: Record<string, boolean>,
    solvedOverride?: boolean,
    selectedWordOverride?: string
  ) => {
    // Get all word variants for selected word (for highlighting)
    // Use override if provided, otherwise use state
    // If override is explicitly empty string, don't highlight
    const wordToHighlight =
      selectedWordOverride !== undefined
        ? selectedWordOverride === ""
          ? null
          : selectedWordOverride
        : selectedWord === ""
        ? null
        : selectedWord;
    const selectedWordVariants = new Set<string>();
    if (wordToHighlight) {
      selectedWordVariants.add(wordToHighlight);
      // If selected word is a root, add all its lemmas
      if (rootToLemmas[wordToHighlight]) {
        rootToLemmas[wordToHighlight].forEach((lemma) => {
          selectedWordVariants.add(lemma);
        });
      }
      // If selected word is a lemma, find its root and add all related lemmas
      if (lemmaToRoot[wordToHighlight]) {
        const root = lemmaToRoot[wordToHighlight];
        selectedWordVariants.add(root);
        if (rootToLemmas[root]) {
          rootToLemmas[root].forEach((lemma) => {
            selectedWordVariants.add(lemma);
          });
        }
      }
    }

    const updatedSections = sectionsToRender.map((section) => ({
      ...section,
      tokens: section.tokens.map((token) => {
        if (token.wordNormal) {
          // Highlight if it's part of selected word's variants AND is revealed
          const isSelectedVariant = selectedWordVariants.has(token.wordNormal);
          const isRevealed = !shouldRedact(
            token.wordNormal,
            debugOverride,
            guessesOverride,
            revealedOverride,
            solvedOverride
          );
          const shouldHighlight = isSelectedVariant && isRevealed;

          return {
            ...token,
            redacted: shouldRedact(
              token.wordNormal,
              debugOverride,
              guessesOverride,
              revealedOverride,
              solvedOverride
            ),
            highlight: shouldHighlight,
          };
        }
        return token;
      }),
    }));
    setSections(updatedSections);
  };

  // Helper to get localStorage key for a specific date
  const getStorageKey = (date: Date): string => {
    const dayNum = getDayNumber(date);
    return `redactle_day_${dayNum}`;
  };

  // Initialize game for selected date
  useEffect(() => {
    const initializeGame = () => {
      const storageKey = getStorageKey(selectedDate);
      const savedState = localStorage.getItem(storageKey);
      
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setGameState(parsed);
          return;
        } catch (e) {
          console.error("Error parsing saved state:", e);
        }
      }

      // New game for this date
      const newState = {
        urlTitle: `Redactle #${getDayNumber(selectedDate)}`,
        guesses: {},
        revealed: {},
        solved: false,
        guessDisplayNames: {},
        guessOrder: [],
      };
      setGameState(newState);
      localStorage.setItem(storageKey, JSON.stringify(newState));
    };

    // Reset all states when date changes
    setCurrentGuess("");
    setSelectedWord("");
    setMessage("");
    setSections([]);
    setWordCount({});
    setTokenLookup({});
    setUndoStack([]);
    setLastRevealed({});
    setDebugRevealAll(false);
    setLastScrollIndex({});
    setRootToLemmas({});
    setLemmaToRoot({});

    initializeGame();
  }, [selectedDate]);

  // Load article when game state is ready
  useEffect(() => {
    if (gameState) {
      loadArticle();
    }
  }, [gameState?.urlTitle, selectedDate]);

  // Save game state for current date
  useEffect(() => {
    if (gameState) {
      const storageKey = getStorageKey(selectedDate);
      localStorage.setItem(storageKey, JSON.stringify(gameState));
    }
  }, [gameState, selectedDate]);

  // Handle guess submission
  const handleGuess = () => {
    if (!currentGuess.trim() || !gameState) return;

    // Check for spaces - only single words allowed
    if (currentGuess.trim().includes(" ")) {
      setMessage("Sadece tek kelime girebilirsiniz!");
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    const guessNormalized = normalize(currentGuess.trim());

    // Validate guess
    if (commonWordsDict[guessNormalized]) {
      setMessage("Bu kelime çok yaygın, tahmin edilemez!");
      setTimeout(() => setMessage(""), 2000);
      setCurrentGuess("");
      return;
    }

    if (
      !/^[\w\u0130\u0131\u011E\u011F\u015E\u015F\u00C7\u00E7\u00D6\u00F6\u00DC\u00FC]+$/.test(
        guessNormalized
      )
    ) {
      setMessage("Geçersiz kelime!");
      setTimeout(() => setMessage(""), 2000);
      setCurrentGuess("");
      return;
    }

    // Save current guesses + revealed to undo stack so the user can revert this action
    setUndoStack((s) => [
      ...s,
      {
        guesses: { ...(gameState?.guesses || {}) },
        revealed: { ...((gameState as any)?.revealed || {}) },
        guessDisplayNames: { ...(gameState?.guessDisplayNames || {}) },
      },
    ]);

    // Determine matching variants from tokenLookup (cover inflections)
    const matches = getMatchingVariants(guessNormalized);

    // Consider 'already' only if the exact entered word was already guessed.
    const already = gameState.guesses[guessNormalized] !== undefined;
    if (already) {
      setMessage("Bu kelimeyi zaten tahmin ettiniz!");
      setTimeout(() => setMessage(""), 2000);
      setCurrentGuess("");
      return;
    }

    // Update guesses and mark matched variants as revealed. The guesses list
    // should contain only what the user typed (guessNormalized), while the
    // 'revealed' map marks all variants that should be shown in the text.
    const updatedGuesses: Record<string, number> = { ...gameState.guesses };
    const updatedRevealed: Record<string, boolean> = {
      ...(gameState.revealed || {}),
    };
    // mark all matched variants as revealed and record which ones were opened by this guess
    const newlyRevealed: Record<string, boolean> = {};
    if (matches.length > 0) {
      matches.forEach((m) => {
        updatedRevealed[m] = true;
        newlyRevealed[m] = true;
      });
    }
    // compute total occurrences for the guessed word: sum occurrences of all matched variants
    let totalCount = 0;
    if (matches.length > 0) {
      totalCount = matches.reduce((s, m) => s + (wordCount[m] || 0), 0);
    }
    // if there were no matches found, fall back to the direct word count
    if (totalCount === 0) {
      totalCount = wordCount[guessNormalized] || 0;
      newlyRevealed[guessNormalized] = true;
      updatedRevealed[guessNormalized] = true;
    }
    // always record the exact user guess in guesses map, with the summed count
    updatedGuesses[guessNormalized] = totalCount;
    // Store original display name (with Turkish characters preserved)
    const originalGuess = currentGuess.trim();
    const updatedDisplayNames = {
      ...(gameState.guessDisplayNames || {}),
      [guessNormalized]: originalGuess,
    };
    // Clear lastRevealed and set selected word to the newly guessed word
    setLastRevealed({});
    setSelectedWord(guessNormalized);

    // Update guessOrder: add to beginning if not already present
    const existingOrder = gameState.guessOrder || [];
    const newGuessOrder = existingOrder.includes(guessNormalized)
      ? existingOrder // Already in list, don't add again
      : [guessNormalized, ...existingOrder]; // Add to beginning

    const updatedState = {
      ...gameState,
      guesses: updatedGuesses,
      revealed: updatedRevealed,
      guessDisplayNames: updatedDisplayNames,
      guessOrder: newGuessOrder,
    };

    // Check if solved (all words in title are revealed)
    if (sections.length > 0 && sections[0].headline) {
      const titleTokens = sections[0].tokens.filter((t) => t.wordNormal);
      const allTitleWordsRevealed = titleTokens.every(
        (token) =>
          !token.wordNormal ||
          !shouldRedact(
            token.wordNormal,
            undefined,
            updatedGuesses,
            updatedRevealed,
            false
          )
      );
      if (allTitleWordsRevealed && titleTokens.length > 0) {
        updatedState.solved = true;
        // Reveal all words when solved
        const allWords = Object.keys(wordCount);
        allWords.forEach((word) => {
          updatedRevealed[word] = true;
        });
        updatedState.revealed = updatedRevealed;
        setMessage("Tebrikler! Makaleyi çözdünüz!");
        
        // Mark as completed in daily games tracking (backend)
        const gameDay = getDayNumber(selectedDate);
        const completionDate = formatDate(selectedDate);
        if (backendUserId) {
          markDailyGameCompleted(backendUserId, "redactle", gameDay, completionDate).then(() => {
            // Dispatch event to update AppBar
            window.dispatchEvent(new CustomEvent("dailyProgressUpdate", { 
              detail: { gameId: "redactle", gameNumber: gameDay } 
            }));
          });
        }
        // Also mark in localStorage for backwards compatibility
        markGameCompleted("redactle", completionDate);
      }
    }

    setGameState(updatedState);
    // Re-render tokens using the updated guesses and revealed map so the correct guess/variants are revealed immediately
    // If solved, reveal all words
    if (updatedState.solved) {
      renderTokens(
        sections,
        wordCount,
        tokenLookup,
        false,
        updatedState.guesses,
        updatedState.revealed,
        true,
        guessNormalized
      );
    } else {
      renderTokens(
        sections,
        wordCount,
        tokenLookup,
        undefined,
        updatedState.guesses,
        updatedState.revealed,
        updatedState.solved,
        guessNormalized
      );
    }
    setCurrentGuess("");
  };

  // Undo the last guess action (restore previous guesses snapshot)
  const handleUndo = () => {
    if (!gameState) return;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const newStack = [...prev];
      const last = newStack.pop();
      const restoredGuesses = (last && last.guesses) || {};
      const restoredRevealed = (last && last.revealed) || {};
      const restoredDisplayNames = (last && last.guessDisplayNames) || {};
      const updatedState = {
        ...gameState,
        guesses: restoredGuesses,
        revealed: restoredRevealed,
        guessDisplayNames: restoredDisplayNames,
      };
      setGameState(updatedState);
      // Re-render tokens with restored guesses and revealed
      renderTokens(
        sections,
        wordCount,
        tokenLookup,
        undefined,
        restoredGuesses,
        restoredRevealed,
        updatedState.solved
      );
      setMessage("Son tahmin geri alındı");
      setTimeout(() => setMessage(""), 1500);
      // clear lastRevealed because the last action was undone
      setLastRevealed({});
      return newStack;
    });
  };

  // Clear all guesses (but keep the same article). Push current state to undo stack so user can undo.
  const handleClearGuesses = () => {
    if (!gameState) return;
    setUndoStack((s) => [
      ...s,
      {
        guesses: { ...(gameState.guesses || {}) },
        revealed: { ...((gameState as any).revealed || {}) },
        guessDisplayNames: { ...(gameState.guessDisplayNames || {}) },
      },
    ]);
    const updatedState = { ...gameState, guesses: {}, guessDisplayNames: {} };
    setGameState(updatedState);
    renderTokens(
      sections,
      wordCount,
      tokenLookup,
      undefined,
      {},
      {},
      updatedState.solved
    );
    setSelectedWord("");
    setMessage("Tüm tahminler silindi");
    setTimeout(() => setMessage(""), 1500);
    setLastRevealed({});
  };

  // Select word to highlight
  const selectWord = (wordNormal: string) => {
    // Clear any pending scroll/highlight timeouts from previous selections
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    // Clear all scroll timeouts
    scrollTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    scrollTimeoutsRef.current = [];
    if (clearHighlightTimeoutRef.current) {
      clearTimeout(clearHighlightTimeoutRef.current);
      clearHighlightTimeoutRef.current = null;
    }
    // Clear bouncing state
    setBouncingTokenId(null);

    // If clicking on the same word that's already selected, scroll to next occurrence
    // Don't change highlights - they should only change when a different word is selected
    if (selectedWord === wordNormal) {
      // Collect tokens for scrolling
      const wordVariants = new Set<string>();
      wordVariants.add(wordNormal);
      if (rootToLemmas[wordNormal]) {
        rootToLemmas[wordNormal].forEach((lemma) => {
          wordVariants.add(lemma);
        });
      }
      if (lemmaToRoot[wordNormal]) {
        const root = lemmaToRoot[wordNormal];
        wordVariants.add(root);
        if (rootToLemmas[root]) {
          rootToLemmas[root].forEach((lemma) => {
            wordVariants.add(lemma);
          });
        }
      }

      const tokensInOrder: Token[] = [];
      const tokenIdSet = new Set<string>();
      for (const section of sections) {
        for (const token of section.tokens) {
          if (token.wordNormal && wordVariants.has(token.wordNormal)) {
            if (!shouldRedact(token.wordNormal)) {
              if (!tokenIdSet.has(token.id)) {
                tokensInOrder.push(token);
                tokenIdSet.add(token.id);
              }
            }
          }
        }
      }

      if (tokensInOrder.length > 0) {
        const prevIdx = lastScrollIndex[wordNormal];
        const idx =
          prevIdx === undefined
            ? tokensInOrder.length > 1
              ? 1
              : 0
            : (prevIdx + 1) % tokensInOrder.length;
        const tokenId = tokensInOrder[idx].id;
        setLastScrollIndex((s) => ({
          ...s,
          [wordNormal]: idx,
        }));

        requestAnimationFrame(() => {
          scrollTimeoutRef.current = setTimeout(() => {
            const el = tokenId ? document.getElementById(tokenId) : null;
            if (el) {
              // Set bouncing state for this token
              setBouncingTokenId(tokenId);

              el.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });

              // Clear bounce animation after it completes (600ms)
              setTimeout(() => {
                setBouncingTokenId((prev) => (prev === tokenId ? null : prev));
              }, 600);
            }
          }, 50);
        });
      }
      return;
    }

    // Collect all word variants (the word itself and all its lemmas)
    const wordVariants = new Set<string>();
    wordVariants.add(wordNormal);

    // If this word is a root, add all its lemmas
    if (rootToLemmas[wordNormal]) {
      rootToLemmas[wordNormal].forEach((lemma) => {
        wordVariants.add(lemma);
      });
    }

    // If this word is a lemma, find its root and add all related lemmas
    if (lemmaToRoot[wordNormal]) {
      const root = lemmaToRoot[wordNormal];
      wordVariants.add(root);
      if (rootToLemmas[root]) {
        rootToLemmas[root].forEach((lemma) => {
          wordVariants.add(lemma);
        });
      }
    }

    // Collect tokens in document order (top to bottom)
    const tokensInOrder: Token[] = [];
    const tokenIdSet = new Set<string>();

    // Iterate through sections to maintain document order
    for (const section of sections) {
      for (const token of section.tokens) {
        if (token.wordNormal && wordVariants.has(token.wordNormal)) {
          // Only include revealed tokens (not redacted)
          if (!shouldRedact(token.wordNormal)) {
            // Avoid duplicates
            if (!tokenIdSet.has(token.id)) {
              tokensInOrder.push(token);
              tokenIdSet.add(token.id);
            }
          }
        }
      }
    }

    // If no revealed tokens, try to include all tokens
    if (tokensInOrder.length === 0) {
      for (const section of sections) {
        for (const token of section.tokens) {
          if (token.wordNormal && wordVariants.has(token.wordNormal)) {
            if (!tokenIdSet.has(token.id)) {
              tokensInOrder.push(token);
              tokenIdSet.add(token.id);
            }
          }
        }
      }
    }

    if (tokensInOrder.length === 0) {
      // still re-render to highlight selection
      setSelectedWord(wordNormal);
      renderTokens(
        sections,
        wordCount,
        tokenLookup,
        undefined,
        undefined,
        undefined,
        undefined,
        wordNormal
      );
      // If word has 0 occurrences, scroll to top
      scrollTimeoutRef.current = setTimeout(() => {
        if (articleRef.current) {
          articleRef.current.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
        // Don't auto-clear highlights - keep them visible until user clicks again
      }, 50);
      return;
    }

    // pick next index for this word (start from second occurrence on first click, cycle through)
    const prevIdx = lastScrollIndex[wordNormal];
    // If first click (prevIdx is undefined), start at index 1 (second occurrence) if available
    // Otherwise, go to next occurrence
    let idx: number;
    if (prevIdx === undefined) {
      // First click: go to second occurrence (index 1) if available, otherwise index 0
      idx = tokensInOrder.length > 1 ? 1 : 0;
    } else {
      idx = (prevIdx + 1) % tokensInOrder.length;
    }
    const tokenId = tokensInOrder[idx].id;
    // update index for next click
    setLastScrollIndex((s) => ({
      ...s,
      [wordNormal]: idx,
    }));

    // Render with highlights FIRST using override parameter (before state update)
    // This ensures highlights are visible immediately without waiting for state update
    renderTokens(
      sections,
      wordCount,
      tokenLookup,
      undefined,
      undefined,
      undefined,
      undefined,
      wordNormal
    );

    // Then update state (this won't cause highlight loss since we use override)
    setSelectedWord(wordNormal);

    // Scroll through all revealed tokens sequentially with bounce animation
    // Start from the first token and scroll through all of them one by one
    if (tokensInOrder.length > 0) {
      const scrollToNext = (index: number) => {
        if (index >= tokensInOrder.length) return;

        const token = tokensInOrder[index];
        const el = token.id ? document.getElementById(token.id) : null;

        if (el) {
          // Set bouncing state for this token
          setBouncingTokenId(token.id);

          // Scroll to the element
          el.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });

          // Wait for scroll to complete (smooth scroll takes ~500-1000ms) then move to next
          const timeout = setTimeout(() => {
            // Clear bounce animation after it completes
            setBouncingTokenId((prev) => (prev === token.id ? null : prev));

            // Scroll to next token after a short delay
            setTimeout(() => {
              scrollToNext(index + 1);
            }, 200);
          }, 600);

          scrollTimeoutsRef.current.push(timeout);
        } else {
          // If element not found, try next one
          scrollToNext(index + 1);
        }
      };

      // Start scrolling from the first token
      requestAnimationFrame(() => {
        scrollTimeoutRef.current = setTimeout(() => {
          scrollToNext(0);
        }, 50);
      });
    }
  };

  // Get accuracy percentage
  const getAccuracyPercent = (): string => {
    if (!gameState) return "0";
    const guessCount = Object.keys(gameState.guesses).length;
    if (guessCount === 0) return "0";
    const hits = Object.values(gameState.guesses).filter((x) => x > 0).length;
    const accuracy = hits / guessCount;
    return `${Math.round(accuracy * 10000) / 100}`;
  };

  const resetGame = () => {
    // Clear all state
    setCurrentGuess("");
    setSelectedWord("");
    setMessage("");
    setSections([]);
    setWordCount({});
    setTokenLookup({});
    setUndoStack([]);
    setLastRevealed({});
    setDebugRevealAll(false);
    setLastScrollIndex({});
    setRootToLemmas({});
    setLemmaToRoot({});

    // Unmark from daily games tracking when reset
    unmarkGameCompleted("redactle", formatDate(selectedDate));

    // Reset game state for current date
    const storageKey = getStorageKey(selectedDate);
    const newState = {
      urlTitle: `Redactle #${getDayNumber(selectedDate)}-${Date.now()}`,
      guesses: {},
      revealed: {},
      solved: false,
      guessDisplayNames: {},
      guessOrder: [],
    };
    setGameState(newState);
    // Then set it back to trigger loadArticle
    setTimeout(() => {
      const finalState = {
        ...newState,
        urlTitle: `Redactle #${getDayNumber(selectedDate)}`,
      };
      setGameState(finalState);
      localStorage.setItem(storageKey, JSON.stringify(finalState));
    }, 0);
  };

  // Navigation functions for date picker
  const canGoNext = (): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const canGoPrev = (): boolean => {
    const dayNum = getDayNumber(selectedDate);
    return dayNum > 1;
  };

  const goToNextDay = () => {
    if (!canGoNext()) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToPrevDay = () => {
    if (!canGoPrev()) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = (): boolean => {
    const today = new Date();
    return getDayNumber(selectedDate) === getDayNumber(today);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header - fixed */}
      <header className="fixed top-0 left-0 right-0 md:right-80 bg-slate-900 z-20 px-4 md:px-8 pt-4 pb-4 border-b border-slate-700">
        {/* Top row: Back button | Title + Date | Menu */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-800 rounded transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Center: Title and Date Selector */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl md:text-2xl font-bold">
              Redactle #{getDayNumber(selectedDate)}
            </h1>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={goToPrevDay}
                disabled={!canGoPrev()}
                className={`p-1 rounded transition-colors ${
                  canGoPrev() 
                    ? "hover:bg-slate-700 text-slate-300" 
                    : "text-slate-600 cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowDatePicker(true)}
                className="flex items-center gap-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-sm"
              >
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">{formatDateDisplay(selectedDate)}</span>
                {isToday() && (
                  <span className="text-xs bg-emerald-600 px-1.5 py-0.5 rounded text-white">Bugün</span>
                )}
                {gameState?.solved && (
                  <span className="text-xs bg-emerald-600 px-1.5 py-0.5 rounded text-white">✓</span>
                )}
              </button>
              
              <button
                onClick={goToNextDay}
                disabled={!canGoNext()}
                className={`p-1 rounded transition-colors ${
                  canGoNext() 
                    ? "hover:bg-slate-700 text-slate-300" 
                    : "text-slate-600 cursor-not-allowed"
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="w-6 h-6" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 top-12 w-56 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-2 z-50">
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                      onClick={() => {
                        setShowHowToPlay(true);
                        setShowMenu(false);
                      }}
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span>Nasıl Oynanır</span>
                    </button>
                    {!isToday() && (
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          goToToday();
                          setShowMenu(false);
                        }}
                      >
                        <Calendar className="w-5 h-5" />
                        <span>Bugüne Git</span>
                      </button>
                    )}
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                      onClick={() => {
                        const newVal = !debugRevealAll;
                        setDebugRevealAll(newVal);
                        renderTokens(sections, wordCount, tokenLookup, newVal);
                        setMessage(
                          newVal ? "DEBUG: Tüm kelimeler gösteriliyor" : ""
                        );
                        if (!newVal) setTimeout(() => setMessage(""), 600);
                        setShowMenu(false);
                      }}
                    >
                      {debugRevealAll ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                      <span>{debugRevealAll ? "Gizle" : "Tümünü Göster"}</span>
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                      onClick={() => {
                        resetGame();
                        setShowMenu(false);
                      }}
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Sıfırla</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content wrapper with padding for fixed header */}
      <div className="pt-18 pb-32 md:pb-0 md:pr-80">
        {/* Success State - Contexto style */}
        {gameState?.solved && (
          <div className="mt-8 mb-10 mx-8 bg-slate-800 rounded-lg p-6 text-center border-2 border-emerald-600">
            <h2 className="text-2xl font-bold mb-3 text-emerald-500">
              Tebrikler!
            </h2>

            {/* Oyun Bilgileri */}
            <div className="mb-3 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin:{" "}
                <span className="text-slate-400">
                  {Object.keys(gameState.guesses).length}
                </span>
              </span>
              <span className="text-slate-500">
                Doğruluk:{" "}
                <span className="text-emerald-400">
                  %{getAccuracyPercent()}
                </span>
              </span>
            </div>

            {/* Makale Başlığı */}
            <p className="text-lg mb-4">
              Makaleyi buldunuz:{" "}
              <span className="font-bold text-emerald-500">
                {articleTitle.toUpperCase()}
              </span>
            </p>

            {/* Tahmin İstatistikleri */}
            <div className="mb-4 space-y-2 max-w-md mx-auto flex flex-col items-center">
              {(() => {
                const successfulGuesses = Object.values(
                  gameState.guesses
                ).filter((count) => count > 0).length;
                const failedGuesses = Object.values(gameState.guesses).filter(
                  (count) => count === 0
                ).length;

                return (
                  <>
                    {successfulGuesses > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({
                            length: Math.ceil(successfulGuesses / 15),
                          }).map((_, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 bg-emerald-600"
                            ></div>
                          ))}
                        </div>
                        <span className="font-semibold text-sm min-w-8 text-right">
                          {successfulGuesses} başarılı
                        </span>
                      </div>
                    )}

                    {failedGuesses > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({
                            length: Math.ceil(failedGuesses / 15),
                          }).map((_, i) => (
                            <div key={i} className="w-4 h-4 bg-slate-600"></div>
                          ))}
                        </div>
                        <span className="font-semibold text-sm min-w-8 text-right">
                          {failedGuesses} başarısız
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowDatePicker(true)}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Önceki günleri oyna
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex relative">
          {/* Article area - full width, scrollable with page */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center text-slate-400 text-lg py-20">
                Makale yükleniyor...
              </div>
            ) : (
              <div
                ref={(el) => {
                  articleRef.current = el ?? null;
                }}
                className="text-slate-200 text-lg leading-loose px-8 pb-6"
              >
                {sections.map((section, sectionIdx) => {
                  // Check if this is a list item (starts with bullet point)
                  const isListItem =
                    section.tokens.length > 0 &&
                    section.tokens[0].value === "• ";
                  return (
                    <div
                      key={sectionIdx}
                      className={
                        section.headline
                          ? "mt-10 mb-4"
                          : isListItem
                          ? "mb-1"
                          : "mb-4"
                      }
                    >
                      {section.headline ? (
                        <h2 className="text-2xl font-bold text-slate-100 mb-2 leading-10">
                          {section.tokens.map((token, tokenIdx) => {
                            // If token has no wordNormal, it's a space/punctuation - render directly
                            if (!token.wordNormal) {
                              return <span key={tokenIdx}>{token.value}</span>;
                            }
                            return (
                              <span
                                key={tokenIdx}
                                className="relative inline-block"
                              >
                                <span
                                  id={token.id}
                                  className={`${
                                    token.highlight
                                      ? "bg-emerald-700 text-white"
                                      : ""
                                  } ${
                                    token.redacted
                                      ? "bg-slate-700 text-slate-700 select-none mb-2 align-top"
                                      : "text-slate-100"
                                  } ${
                                    bouncingTokenId === token.id
                                      ? "word-bounce"
                                      : ""
                                  }`}
                                  style={{
                                    cursor: token.redacted
                                      ? "pointer"
                                      : "default",
                                  }}
                                  onClick={() => {
                                    if (token.redacted && token.id) {
                                      setClickedTokenId(token.id);
                                      setTimeout(
                                        () => setClickedTokenId(null),
                                        2000
                                      );
                                    }
                                  }}
                                >
                                  {token.redacted
                                    ? "█".repeat(
                                        Math.max(token.value.length, 3)
                                      )
                                    : token.value}
                                </span>
                                {clickedTokenId === token.id &&
                                  token.redacted && (
                                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-50">
                                      {token.value.length} harf
                                    </span>
                                  )}
                              </span>
                            );
                          })}
                        </h2>
                      ) : (
                        <p className={isListItem ? "mb-0" : "mb-4"}>
                          {section.tokens.map((token, tokenIdx) => {
                            // If token has no wordNormal, it's a space/punctuation - render directly
                            if (!token.wordNormal) {
                              return <span key={tokenIdx}>{token.value}</span>;
                            }
                            return (
                              <span
                                key={tokenIdx}
                                className="relative inline-block"
                              >
                                <span
                                  id={token.id}
                                  className={`${
                                    token.highlight
                                      ? "bg-emerald-700 text-white"
                                      : ""
                                  } ${
                                    token.redacted
                                      ? "bg-slate-700 text-slate-700 select-none mb-2 align-top"
                                      : "text-slate-200"
                                  } ${
                                    bouncingTokenId === token.id
                                      ? "word-bounce"
                                      : ""
                                  }`}
                                  style={{
                                    cursor: token.redacted
                                      ? "pointer"
                                      : "default",
                                  }}
                                  onClick={() => {
                                    if (token.redacted && token.id) {
                                      setClickedTokenId(token.id);
                                      setTimeout(
                                        () => setClickedTokenId(null),
                                        2000
                                      );
                                    }
                                  }}
                                >
                                  {token.redacted
                                    ? "█".repeat(
                                        Math.max(token.value.length, 3)
                                      )
                                    : token.value}
                                </span>
                                {clickedTokenId === token.id &&
                                  token.redacted && (
                                    <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded whitespace-nowrap z-50">
                                      {token.value.length} harf
                                    </span>
                                  )}
                              </span>
                            );
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Sidebar - fixed position, bottom on mobile, right on desktop */}
          <aside className="fixed bottom-0 left-0 right-0 md:right-0 md:left-auto md:top-0 md:bottom-auto w-full md:w-80 bg-slate-800 border-t md:border-t-0 md:border-l border-slate-700 text-slate-200 flex flex-col md:flex-col max-h-[50vh] md:max-h-none md:h-screen z-10 shadow-lg md:shadow-none overflow-hidden">
            {/* Mobile: Reverse order - Guesses first, Input last */}
            <div className="flex flex-col-reverse md:flex-col flex-1 min-h-0 overflow-hidden p-4">
              {/* Input Form - only show if game not solved - Mobile: bottom, Desktop: top */}
              {!gameState?.solved && !loading && (
                <div className="mb-4 md:mb-4 mt-4 md:mt-0 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleGuess();
                    }}
                  >
                    <input
                      type="text"
                      className="w-full box-border rounded-md bg-slate-700 border border-slate-600 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-500 transition-all"
                      placeholder="Bir kelime yaz..."
                      value={currentGuess}
                      onChange={(e) => setCurrentGuess(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleGuess()}
                      disabled={loading}
                    />
                  </form>
                </div>
              )}

              {/* Message - shown in sidebar */}
              {message && (
                <div className="mb-4 md:mb-4 mt-4 md:mt-0 shrink-0 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-center">
                  <p className="text-xs text-slate-200">{message}</p>
                </div>
              )}

              {/* Guesses List - Mobile: max-height with scroll, Desktop: normal */}
              <div className="flex-1 min-h-0 flex flex-col mb-4 md:mb-4 overflow-hidden">
                <h3 className="text-sm text-slate-400 mb-2 font-semibold shrink-0">
                  Tahminler ({Object.keys(gameState?.guesses || {}).length})
                </h3>
                <div className="space-y-2 overflow-y-auto md:flex-1 min-h-0 max-h-[25vh] md:max-h-none pr-1 custom-scrollbar">
                  {gameState && Object.keys(gameState.guesses).length === 0 && (
                    <div className="text-slate-500 text-sm text-center py-4">
                      Henüz tahmin yapılmadı
                    </div>
                  )}
                  {gameState &&
                    (gameState.guessOrder || Object.keys(gameState.guesses))
                      .map((word, idx) => {
                        const count = gameState.guesses[word];
                        if (count === undefined) return null; // Skip if word not in guesses
                        // Get original display name (with Turkish characters) or fall back to normalized word
                        const displayName =
                          gameState.guessDisplayNames?.[word] || word;
                        return (
                          <div
                            key={idx}
                            onClick={() => selectWord(word)}
                            className={`flex justify-between items-center px-3 py-2 rounded cursor-pointer transition-colors ${
                              count > 0
                                ? "bg-slate-700 hover:bg-slate-600"
                                : "bg-slate-700/50 hover:bg-slate-700"
                            }`}
                          >
                            <div className="font-semibold">{displayName}</div>
                            <div className="text-sm text-slate-400">
                              {count}
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div
          className="fixed inset-0 bg-[#00000075] flex items-center justify-center p-4 z-50"
          onClick={() => setShowHowToPlay(false)}
        >
          <div
            className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="text-2xl">❓</span> Nasıl Oynanır
              </h2>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-slate-200">
              <p className="text-base leading-relaxed">
                Kelimeleri tahmin ederek gizli makaleyi ortaya çıkarın.
              </p>
              <p className="text-base leading-relaxed">
                Makaledeki kelimeler gizlenmiştir. Doğru kelimeleri tahmin
                ederek makaleyi çözün.
              </p>
              <p className="text-base leading-relaxed">
                Başlıktaki tüm kelimeleri açtığınızda oyunu kazanırsınız.
              </p>
              <p className="text-base leading-relaxed">
                Çok yaygın kelimeler (bir, bu, ve, gibi) otomatik olarak
                gösterilir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="bg-slate-800 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-100">Önceki Oyunlar</h2>
              <button
                onClick={() => setShowDatePicker(false)}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content - List of past days */}
            <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {(() => {
                const today = new Date();
                const todayDayNum = getDayNumber(today);
                const days = [];
                
                // Generate list of all available days (from today back to day 1)
                for (let dayNum = todayDayNum; dayNum >= 1; dayNum--) {
                  const dayDate = new Date(REDACTLE_START_DATE);
                  dayDate.setDate(REDACTLE_START_DATE.getDate() + (dayNum - 1));
                  
                  // Check game status from localStorage
                  const storageKey = `redactle_day_${dayNum}`;
                  let status: "won" | "playing" | "not-played" = "not-played";
                  let guessCount = 0;
                  
                  try {
                    const savedState = localStorage.getItem(storageKey);
                    if (savedState) {
                      const parsed = JSON.parse(savedState);
                      if (parsed.solved === true) {
                        status = "won";
                      } else if (parsed.guesses && Object.keys(parsed.guesses).length > 0) {
                        status = "playing";
                      }
                      guessCount = parsed.guesses ? Object.keys(parsed.guesses).length : 0;
                    }
                  } catch (e) {}
                  
                  const isTodayDay = dayNum === todayDayNum;
                  
                  days.push(
                    <button
                      key={dayNum}
                      onClick={() => {
                        setSelectedDate(dayDate);
                        setShowDatePicker(false);
                      }}
                      className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-4 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <div className="w-8 h-8 flex items-center justify-center">
                          {status === "won" ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          ) : status === "playing" ? (
                            <Play className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-slate-500" />
                          )}
                        </div>

                        {/* Game Info */}
                        <div className="text-left">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-emerald-400">
                                #{dayNum}
                              </span>
                              <span className="text-sm text-slate-400 font-medium">
                                {formatDateDisplay(dayDate)}
                              </span>
                              {isTodayDay && (
                                <span className="text-xs bg-emerald-600 px-2 py-0.5 rounded text-white">
                                  Bugün
                                </span>
                              )}
                            </div>
                            {status !== "not-played" && (
                              <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
                                {status === "won" 
                                  ? `${guessCount} tahminle çözüldü` 
                                  : `${guessCount} tahmin yapıldı`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Text */}
                      <div className="text-sm font-semibold">
                        {status === "won" ? (
                          <span className="text-emerald-500">Kazanıldı</span>
                        ) : status === "playing" ? (
                          <span className="text-yellow-500">Oynuyor</span>
                        ) : (
                          <span className="text-slate-500">Oynanmadı</span>
                        )}
                      </div>
                    </button>
                  );
                }
                
                return days;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1e293b;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }

        /* Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #475569 #1e293b;
        }

        /* Word bounce animation - scale up and down */
        @keyframes wordBounce {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        .word-bounce {
          animation: wordBounce 0.6s ease-in-out;
          display: inline-block;
          transform-origin: center;
        }
      `}</style>
    </main>
  );
};

export default Redactle;
