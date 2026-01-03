"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreVertical,
  HelpCircle,
  Flag,
  RotateCcw,
  Calendar,
  Film,
  Bug,
  Map,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  History,
  User,
} from "lucide-react";
import { LightBulbIcon } from "@heroicons/react/24/solid";
import { formatDate } from "@/lib/dailyCompletion";
import { triggerDataRefresh } from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { completeLevel as completeLevelBackend } from "@/app/levels/actions";
import { markDailyGameCompleted, saveGameState, getGameState as getEncoreGameState, deleteGameState } from "@/app/games/actions";
import { useUserStats } from "@/hooks/useProfileData";
import { useHint } from "@/app/store/actions";
import ConfirmJokerModal from "@/components/ConfirmJokerModal";

// Genre ID -> İsim eşleştirmesi
const GENRE_MAP: Record<number, string> = {
  28: "Aksiyon",
  12: "Macera",
  16: "Animasyon",
  35: "Komedi",
  80: "Suç",
  99: "Belgesel",
  18: "Dram",
  10751: "Aile",
  14: "Fantastik",
  36: "Tarih",
  27: "Korku",
  10402: "Müzik",
  9648: "Gizem",
  10749: "Romantik",
  878: "Bilim Kurgu",
  10770: "TV Filmi",
  53: "Gerilim",
  10752: "Savaş",
  37: "Western",
};

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface Movie {
  id: number;
  title: string;
  original_title: string;
  year: number;
  release_date?: string;
  vote_average: number;
  poster_path: string | null;
  overview?: string;
  genre_ids?: number[];
  cast?: CastMember[];
}

interface MoviesPoolData {
  movies: Movie[];
  total_count: number;
}

interface DailyMovieEntry {
  date: string;
  day: number;
  movie: Movie;
}

interface DailyMoviesData {
  daily_movies: DailyMovieEntry[];
}

interface Guess {
  movie: Movie;
  yearComparison: "lower" | "higher" | "correct";
}

const Moviedle = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { backendUserId } = useAuth();
  const mode = searchParams.get("mode"); // "levels" | "practice" | null
  const levelId = searchParams.get("levelId"); // Hangi level'dan gelindi

  // Hint system
  const userStats = useUserStats(backendUserId || undefined);
  const hints = userStats?.hints ?? 0;
  const [revealedActors, setRevealedActors] = useState<CastMember[]>([]);
  const [showHintModal, setShowHintModal] = useState(false);
  const [nextActorIndex, setNextActorIndex] = useState(0); // İlk 5 için 0-4, sonra 5, 6, 7...

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetMovie, setTargetMovie] = useState<Movie | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [showMenu, setShowMenu] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [gameDay, setGameDay] = useState<number | null>(null);
  const [levelCompleted, setLevelCompleted] = useState(false);
  const [showPreviousGames, setShowPreviousGames] = useState(false);
  const [dailyMovies, setDailyMovies] = useState<DailyMovieEntry[]>([]);
  
  // Search modal states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [filterYearMin, setFilterYearMin] = useState<string>("");
  const [filterYearMax, setFilterYearMax] = useState<string>("");
  const [filterGenres, setFilterGenres] = useState<number[]>([]);
  const [excludedGenres, setExcludedGenres] = useState<number[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  
  // Filter collapse states
  const [showYearFilter, setShowYearFilter] = useState(false);
  const [showGenreFilter, setShowGenreFilter] = useState(false);

  // dailyCompleted flag - backend'den yüklendiğinde zaten tamamlanmış oyunlar için tekrar çağırma
  const [dailyCompleted, setDailyCompleted] = useState(false);
  // Game status cache for previous games modal: 'won' | 'lost' | 'playing' | 'not_played'
  const [gameStatusCache, setGameStatusCache] = useState<Record<number, 'won' | 'lost' | 'playing'>>({});
  const isInitialMount = useRef(true);
  
  // Set isInitialMount to false after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Oyun kazanıldığında levels modunda level'ı tamamla
  useEffect(() => {
    if (gameState === "won" && mode === "levels" && levelId && !levelCompleted) {
      const lid = parseInt(levelId);
      // Backend tamamla
      if (backendUserId) {
        completeLevelBackend(backendUserId, lid);
      }
      
      setLevelCompleted(true);
    }
    // Günlük tamamlamayı veritabanına kaydet - sadece yeni kazanılan oyunlar için
    if (gameState === "won" && mode !== "levels" && backendUserId && gameDay && !dailyCompleted && !isInitialMount.current) {
      const completionDate = formatDate(new Date());
      markDailyGameCompleted(backendUserId, "moviedle", gameDay, completionDate);
      setDailyCompleted(true);
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'won' }));
    } else if (gameState === "lost" && mode !== "levels" && backendUserId && gameDay && !dailyCompleted && !isInitialMount.current) {
      setGameStatusCache(prev => ({ ...prev, [gameDay]: 'lost' }));
    }
  }, [gameState, mode, levelId, levelCompleted, backendUserId, gameDay, dailyCompleted]);

  // Load completed games from backend (single efficient API call)
  useEffect(() => {
    if (!backendUserId) return;
    
    const loadCompletedGames = async () => {
      const { getAllCompletedGames } = await import("@/app/games/actions");
      
      const response = await getAllCompletedGames(backendUserId, "moviedle", 50);
      if (response.data?.success && response.data.games) {
        const cache: Record<number, 'won' | 'lost' | 'playing'> = {};
        response.data.games.forEach((g: any) => {
          cache[g.game_number] = g.is_won !== false ? 'won' : 'lost';
        });
        setGameStatusCache(cache);
      }
    };
    loadCompletedGames();
  }, [backendUserId]);

  // Update current game status in cache when guesses are made
  useEffect(() => {
    if (!gameDay || guesses.length === 0 || gameState !== "playing") return;
    setGameStatusCache(prev => ({ ...prev, [gameDay]: 'playing' }));
  }, [guesses, gameDay, gameState]);

  // Film verilerini yükle
  useEffect(() => {
    const loadMovies = async () => {
      try {
        // Tüm filmleri yükle (arama için)
        const moviesResponse = await fetch("/moviedle/movies_pool.json");
        const moviesData: MoviesPoolData = await moviesResponse.json();
        setMovies(moviesData.movies);

        // Günlük film takvimini yükle
        const dailyResponse = await fetch("/moviedle/daily_movies.json");
        const dailyData: DailyMoviesData = await dailyResponse.json();
        setDailyMovies(dailyData.daily_movies);
        
        // URL'den tarih parametresini al
        const dateParam = searchParams.get("date");
        const today = new Date().toISOString().split('T')[0];
        const targetDate = dateParam || today;
        
        // Hedef tarihin filmini bul
        const targetEntry = dailyData.daily_movies.find(entry => entry.date === targetDate);
        
        if (targetEntry) {
          // Günlük film zaten cast, genre_ids dahil tüm bilgileri içeriyor
          setTargetMovie(targetEntry.movie);
          setGameDay(targetEntry.day);
          
          // Yeni güne geçerken state'i sıfırla ki önceki günün sonucu görünmesin
          setGuesses([]);
          setGameState("playing");
          setDailyCompleted(false);
        } else {
          // Eğer bugün için film yoksa rastgele seç (sadece tarih parametresi yoksa)
          // Eğer tarih parametresi varsa ve film yoksa, yine de rastgele seçebiliriz veya hata gösterebiliriz
          // Şimdilik varsayılan davranış: rastgele
          if (!dateParam) {
            const randomIndex = Math.floor(Math.random() * moviesData.movies.length);
            setTargetMovie(moviesData.movies[randomIndex]);
            setGameDay(null);
            setGuesses([]);
            setGameState("playing");
          }
        }
      } catch (error) {
        console.error("Film verileri yüklenemedi:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, [searchParams]);

  // Oyun durumunu yükle - oyun numarası değiştiğinde
  useEffect(() => {
    if (!gameDay) return;
    
    isInitialMount.current = true;

    const loadState = async () => {
      let stateToLoad = null;

      // 1. Load state from Encore if logged in
      if (backendUserId) {
        const response = await getEncoreGameState(backendUserId, "moviedle", gameDay);
        if (response.data?.success && response.data.data) {
          stateToLoad = response.data.data.state as any;
        }
      }

      // 3. Apply state
      if (stateToLoad) {
        setGuesses(stateToLoad.guesses || []);
        setGameState(stateToLoad.gameState || "playing");
        setRevealedActors(stateToLoad.revealedActors || []);
        setNextActorIndex(stateToLoad.nextActorIndex || 0);
      } else {
        setGuesses([]);
        setGameState("playing");
        setRevealedActors([]);
        setNextActorIndex(0);
      }
      
      setTimeout(() => {
        isInitialMount.current = false;
      }, 0);
    };

    loadState();
  }, [gameDay, backendUserId]);

  // Oyun durumunu kaydet
  useEffect(() => {
    if (isInitialMount.current || !gameDay) {
      return;
    }

    const isFinished = gameState !== "playing";
    const stateToSave = {
      guesses,
      gameState,
      revealedActors,
      nextActorIndex
    };

    // Save to Encore if logged in
    if (backendUserId) {
      saveGameState(
        backendUserId,
        "moviedle",
        gameDay,
        stateToSave as any,
        isFinished,
        gameState === "won"
      );
    }
  }, [guesses, gameState, revealedActors, nextActorIndex, gameDay, backendUserId]);

  // Arama filtreleme - filtre/arama yoksa popüler filmler, varsa filtrelenmiş sonuçlar
  const filteredMovies = useMemo(() => {
    if (movies.length === 0) return [];
    
    const hasFilters = filterYearMin || filterYearMax || filterGenres.length > 0 || excludedGenres.length > 0;
    const hasSearch = searchQuery.trim().length > 0;
    
    // Eğer arama ve filtre yoksa en popüler filmleri göster
    if (!hasSearch && !hasFilters) {
      return movies
        .filter((movie) => !guesses.some((g) => g.movie.id === movie.id))
        .sort((a, b) => b.vote_average - a.vote_average)
        .slice(0, 20);
    }
    
    // Başlangıç: tahmin edilmemiş tüm filmler
    let results = movies.filter((movie) => !guesses.some((g) => g.movie.id === movie.id));
    
    // Arama filtresi uygula
    if (hasSearch) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (movie) =>
          movie.title.toLowerCase().includes(query) ||
          movie.original_title.toLowerCase().includes(query)
      );
    }
    
    // Yıl filtresi uygula
    if (filterYearMin) {
      const minYear = parseInt(filterYearMin);
      if (!isNaN(minYear)) {
        results = results.filter(m => m.year >= minYear);
      }
    }
    if (filterYearMax) {
      const maxYear = parseInt(filterYearMax);
      if (!isNaN(maxYear)) {
        results = results.filter(m => m.year <= maxYear);
      }
    }
    
    // Tür filtresi uygula (Include)
    if (filterGenres.length > 0) {
      results = results.filter(m => 
        filterGenres.every(g => m.genre_ids?.includes(g))
      );
    }

    // Tür filtresi uygula (Exclude)
    if (excludedGenres.length > 0) {
      results = results.filter(m => 
        !m.genre_ids?.some(g => excludedGenres.includes(g))
      );
    }
    
    // Puana göre sırala
    return results.sort((a, b) => b.vote_average - a.vote_average);
  }, [searchQuery, guesses, movies, filterYearMin, filterYearMax, filterGenres, excludedGenres]);
  
  // Visible movies (paginated)
  const visibleMovies = useMemo(() => {
    return filteredMovies.slice(0, visibleCount);
  }, [filteredMovies, visibleCount]);

  const handleGuess = (movie: Movie) => {
    if (!targetMovie || gameState !== "playing") return;

    // Yıl karşılaştırması
    let yearComparison: "lower" | "higher" | "correct" = "correct";
    if (movie.year < targetMovie.year) {
      yearComparison = "lower";
    } else if (movie.year > targetMovie.year) {
      yearComparison = "higher";
    }

    const newGuess: Guess = {
      movie,
      yearComparison,
    };

    setGuesses([...guesses, newGuess]);

    if (movie.id === targetMovie.id) {
      setGameState("won");
    } else if (guesses.length >= 5) {
      setGameState("lost");
    }

    setSearchQuery("");
  };

  const resetGame = () => {
    if (movies.length === 0) return;
    
    // If it's a daily game, just restart the current day
    if (gameDay) {
      setGuesses([]);
      setSearchQuery("");
      setGameState("playing");
      setRevealedActors([]);
      setNextActorIndex(0);
      setDailyCompleted(false);
      
      if (backendUserId) {
        deleteGameState(backendUserId, "moviedle", gameDay);
        setGameStatusCache(prev => {
          const newCache = { ...prev };
          delete newCache[gameDay];
          return newCache;
        });
      }
      triggerDataRefresh();
      return;
    }

    // Otherwise pick a random movie (Practice Mode)
    const randomIndex = Math.floor(Math.random() * movies.length);
    setTargetMovie(movies[randomIndex]);
    setGuesses([]);
    setSearchQuery("");
    setGameState("playing");
    setRevealedActors([]);
    setNextActorIndex(0);
  };

  const getYearRange = () => {
    if (guesses.length === 0 || !targetMovie) return { min: "?", max: "?" };

    let min = 1900;
    let max = 2030;

    guesses.forEach((guess) => {
      if (guess.yearComparison === "lower" && guess.movie.year > min) {
        min = guess.movie.year;
      } else if (guess.yearComparison === "higher" && guess.movie.year < max) {
        max = guess.movie.year;
      } else if (guess.yearComparison === "correct") {
        min = guess.movie.year;
        max = guess.movie.year;
      }
    });

    return {
      min: min === 1900 ? "?" : min.toString(),
      max: max === 2030 ? "?" : max.toString(),
    };
  };

  // Hint kullanma fonksiyonu
  const handleUseHint = async () => {
    if (hints <= 0 || !targetMovie || !targetMovie.cast || targetMovie.cast.length === 0) return;
    if (!backendUserId) return;

    const cast = targetMovie.cast;
    
    // Fonksiyon: Bir oyuncunun şu an görünür olup olmadığını kontrol et (ipucu veya tahmin ile)
    const isCurrentlyVisible = (actorId: number) => {
      return revealedActors.some(r => r.id === actorId) || 
             guesses.some(g => g.movie.cast?.some(ca => ca.id === actorId));
    };

    let actorToReveal: CastMember | null = null;

    if (nextActorIndex < 5) {
      // İlk 5 ipucu: İlk 5 oyuncu arasından henüz görünmeyen rastgele birini seç
      const availableInTop5 = cast.slice(0, 5).filter(actor => !isCurrentlyVisible(actor.id));
      if (availableInTop5.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableInTop5.length);
        actorToReveal = availableInTop5[randomIndex];
      }
    }
    
    // Eğer ilk 5'te kalmadıysa veya 5. ipucundan sonraysak, tüm cast içinde ilk görünmeyen oyuncuyu bul
    if (!actorToReveal) {
      actorToReveal = cast.find(actor => !isCurrentlyVisible(actor.id)) || null;
    }

    if (!actorToReveal) {
      // Açılacak oyuncu kalmadı (tüm cast görünür durumda)
      setShowHintModal(false);
      return;
    }

    // Backend'de hint'i kullan
    try {
      await useHint(backendUserId);
      triggerDataRefresh();

      setRevealedActors(prev => [...prev, actorToReveal!]);
      setNextActorIndex(prev => prev + 1);
    } catch (error) {
      console.error("İpucu kullanılırken hata oluştu:", error);
    }
    
    setShowHintModal(false);
  };

  const yearRange = getYearRange();

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 px-4">
      <div className="w-full max-w-md">
        {/* Previous Games Modal */}
        {showPreviousGames && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowPreviousGames(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-sm w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  Önceki Günler
                </h3>
                <button
                  onClick={() => setShowPreviousGames(false)}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="overflow-y-auto pr-2 space-y-2 flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-700 [&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400">
                {dailyMovies
                  .sort((a, b) => b.day - a.day)
                  .filter(entry => new Date(entry.date) <= new Date())
                  .map((entry) => {
                    const isCurrentGame = gameDay === entry.day;
                    const date = new Date(entry.date);
                    const formattedDate = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                    
                    const status = gameStatusCache[entry.day] || 'not_played';
                    const isWon = status === 'won';
                    const isLost = status === 'lost';
                    const isPlaying = status === 'playing';

                    return (
                      <button
                        key={entry.day}
                        onClick={() => {
                          setShowPreviousGames(false);
                          router.push(`/games/moviedle?date=${entry.date}`);
                        }}
                        className={`w-full p-3 rounded-lg border flex items-center justify-between transition-all ${
                          isCurrentGame
                            ? "bg-emerald-900/30 border-emerald-500/50 ring-1 ring-emerald-500/50"
                            : "bg-slate-700/30 border-slate-700 hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-bold text-white">#{entry.day}</div>
                          <div className="text-xs text-slate-400">{formattedDate}</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                           {isWon ? (
                            <span className="text-emerald-400 font-bold text-sm">Çözüldü</span>
                          ) : isLost ? (
                            <span className="text-red-400 font-bold text-sm">Kaybedildi</span>
                          ) : isPlaying ? (
                            <span className="text-blue-400 font-bold text-sm">Devam Ediyor</span>
                          ) : (
                            <span className="text-slate-500 text-sm">Oyna</span>
                          )}
                          {isCurrentGame && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 ml-2" />
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {/* Debug Modal */}
        {showDebugModal && targetMovie && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowDebugModal(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 rounded-xl border border-slate-600 p-6 max-w-sm w-full mx-4 shadow-2xl">
              <div className="flex items-center gap-2 mb-4 text-slate-300">
                <Bug className="w-5 h-5" />
                <h3 className="text-lg font-bold">Debug Mode</h3>
              </div>
              
              <div className="flex gap-4">
                {targetMovie.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${targetMovie.poster_path}`}
                    alt={targetMovie.title}
                    className="w-24 h-36 object-cover rounded-lg flex-shrink-0"
                  />
                ) : (
                  <div className="w-24 h-36 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Film className="w-8 h-8 text-slate-500" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-lg leading-tight mb-1">
                    {targetMovie.title}
                  </p>
                  {targetMovie.original_title !== targetMovie.title && (
                    <p className="text-slate-400 text-sm mb-2">
                      {targetMovie.original_title}
                    </p>
                  )}
                  <p className="text-emerald-400 font-semibold mb-2">
                    {targetMovie.year}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(targetMovie.genre_ids || []).slice(0, 3).map((id) => (
                      <span
                        key={id}
                        className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                      >
                        {GENRE_MAP[id] || "?"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowDebugModal(false)}
                className="w-full mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Kapat
              </button>
            </div>
          </>
        )}

        {/* Confirm Joker Modal */}
        <ConfirmJokerModal
          isOpen={showHintModal}
          onCancel={() => setShowHintModal(false)}
          onConfirm={handleUseHint}
          title="Oyuncu İpucu"
          description="Bir oyuncu ismini açmak istiyor musunuz? Bu işlem 1 ipucu hakkınızı kullanacaktır."
          remainingCount={hints}
          type="hint"
        />

        <header className="mb-6">
          {/* Top row: Back button | Title | Menu */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push(mode === "levels" ? "/levels" : searchParams.get("date") ? `/games?date=${searchParams.get("date")}` : "/games")}
              className="p-2 hover:bg-slate-800 rounded transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-bold">CineGuess</h1>
              {gameDay && (
                <p className="text-xs text-slate-400">Gün #{gameDay}</p>
              )}
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
                          setShowMenu(false);
                        }}
                      >
                        <HelpCircle className="w-5 h-5" />
                        <span>Nasıl Oynanır</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                        onClick={() => {
                          setShowPreviousGames(true);
                          setShowMenu(false);
                        }}
                      >
                        <History className="w-5 h-5" />
                        <span>Önceki Günler</span>
                      </button>
                      <button
                        className={`w-full px-4 py-3 text-left transition-all flex items-center gap-3 ${
                          gameState !== "playing"
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-slate-700 hover:mx-2 hover:rounded-md cursor-pointer"
                        }`}
                        onClick={() => {
                          if (gameState !== "playing" || !targetMovie) return;
                          // Pes et - doğru filmi göster
                          const correctGuess: Guess = {
                            movie: targetMovie,
                            yearComparison: "correct",
                          };
                          setGuesses([...guesses, correctGuess]);
                          setGameState("lost");
                          setShowMenu(false);
                        }}
                      >
                        <Flag className="w-5 h-5" />
                        <span>Pes Et</span>
                      </button>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3 border-t border-slate-700 mt-1"
                        onClick={() => {
                          resetGame();
                          setShowMenu(false);
                        }}
                      >
                        <RotateCcw className="w-5 h-5" />
                        <span>{gameDay ? "Sıfırla" : "Yeni Oyun"}</span>
                      </button>
                      {process.env.NODE_ENV === "development" && (
                        <button
                          className="w-full px-4 py-3 text-left hover:bg-slate-700 hover:mx-2 hover:rounded-md transition-all flex items-center gap-3"
                          onClick={() => {
                            setShowDebugModal(true);
                            setShowMenu(false);
                          }}
                        >
                          <Bug className="w-5 h-5" />
                          <span>Debug: Filmi Göster</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom row: Game info */}
          {gameState === "playing" && (
            <div className="flex items-center gap-4 text-sm font-semibold">
              <span>
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
              <span>
                Kalan:{" "}
                <span className="text-emerald-400">{6 - guesses.length}</span>
              </span>
            </div>
          )}
        </header>

        {/* Success/Failure State */}
        {gameState !== "playing" && targetMovie && (
          <div
            className={`mb-10 bg-slate-800 rounded-lg p-6 text-center border-2 ${
              gameState === "won" ? "border-emerald-600" : "border-red-500"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-3 ${
                gameState === "won" ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {gameState === "won"
                ? "Tebrikler!"
                : "Bir dahaki sefere artık..."}
            </h2>

            {/* Film Bilgileri */}
            <div className="mb-4">
              {targetMovie.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w200${targetMovie.poster_path}`}
                  alt={targetMovie.title}
                  className="w-24 h-36 object-cover rounded-lg mx-auto mb-3"
                />
              )}
              <p className="text-lg">
                {gameState === "won" ? "Filmi buldunuz" : "Film"}:{" "}
                <span
                  className={`font-bold ${
                    gameState === "won" ? "text-emerald-500" : "text-red-400"
                  }`}
                >
                  {targetMovie.title}
                </span>
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {targetMovie.year} •{" "}
                {(targetMovie.genre_ids || [])
                  .slice(0, 3)
                  .map((id) => GENRE_MAP[id] || "Unknown")
                  .join(", ")}
              </p>
            </div>

            {/* İstatistikler */}
            <div className="mb-4 flex items-center justify-center gap-4 text-sm font-semibold">
              <span className="text-slate-500">
                Tahmin: <span className="text-slate-400">{guesses.length}</span>
              </span>
            </div>

            {mode === "levels" ? (
              <button
                onClick={() => router.back()}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2 mx-auto"
              >
                <Map className="w-4 h-4" />
                Bölümlere Devam Et
              </button>
            ) : (
              <button
                onClick={resetGame}
                className="px-6 py-2 rounded-md bg-emerald-600 text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                {gameDay ? "Sıfırla" : "Yeni Oyun"}
              </button>
            )}
          </div>
        )}

        {/* Search Button */}
        {gameState === "playing" && (
          <div className="mb-6">
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-4 text-left flex items-center gap-3 hover:bg-slate-700 transition-colors"
            >
              <Search className="w-5 h-5 text-slate-400" />
              <span className="text-slate-400">Film ara...</span>
            </button>
          </div>
        )}
        
        {/* Search Modal */}
        {showSearchModal && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-50"
              onClick={() => setShowSearchModal(false)}
            />
            <div className="fixed inset-x-4 top-8 bottom-8 z-50 bg-slate-800 rounded-xl border border-slate-600 flex flex-col max-w-lg mx-auto shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800 z-10 rounded-t-xl">
                <h3 className="text-lg font-bold text-white">Film Ara</h3>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-700 [&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400">
                {/* Search Input */}
              <div className="p-4 border-b border-slate-700">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(20);
                  }}
                  placeholder="Film adı ara..."
                  autoFocus
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 placeholder:text-slate-500 transition-all"
                />
              </div>
              
              {/* Filters */}
              <div className="p-4 border-b border-slate-700 space-y-4">
                {/* Year Filter */}
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowYearFilter(!showYearFilter)}
                    className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-300">Yıl Aralığı</span>
                      {(filterYearMin || filterYearMax) && (
                        <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {(filterYearMin ? 1 : 0) + (filterYearMax ? 1 : 0)}
                        </span>
                      )}
                    </div>
                    {showYearFilter ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  
                  {showYearFilter && (
                    <div className="p-3 bg-slate-800/50 border-t border-slate-700">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={filterYearMin}
                          onChange={(e) => {
                            setFilterYearMin(e.target.value);
                            setVisibleCount(20);
                          }}
                          placeholder="Min"
                          className="flex-1 min-w-0 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-500"
                        />
                        <span className="text-slate-500">-</span>
                        <input
                          type="number"
                          value={filterYearMax}
                          onChange={(e) => {
                            setFilterYearMax(e.target.value);
                            setVisibleCount(20);
                          }}
                          placeholder="Max"
                          className="flex-1 min-w-0 rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-600 placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Genre Filter */}
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowGenreFilter(!showGenreFilter)}
                    className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-300">Türler</span>
                      {(filterGenres.length > 0 || excludedGenres.length > 0) && (
                        <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {filterGenres.length + excludedGenres.length}
                        </span>
                      )}
                    </div>
                    {showGenreFilter ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  
                  {showGenreFilter && (
                    <div className="p-3 bg-slate-800/50 border-t border-slate-700">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(GENRE_MAP).map(([id, name]) => {
                          const genreId = parseInt(id);
                          const isIncluded = filterGenres.includes(genreId);
                          const isExcluded = excludedGenres.includes(genreId);
                          return (
                            <button
                              key={id}
                              onClick={() => {
                                if (isIncluded) {
                                  // Include -> Exclude
                                  setFilterGenres(filterGenres.filter(g => g !== genreId));
                                  setExcludedGenres([...excludedGenres, genreId]);
                                } else if (isExcluded) {
                                  // Exclude -> Neutral
                                  setExcludedGenres(excludedGenres.filter(g => g !== genreId));
                                } else {
                                  // Neutral -> Include
                                  setFilterGenres([...filterGenres, genreId]);
                                }
                                setVisibleCount(20);
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                isIncluded
                                  ? "bg-emerald-600 text-white"
                                  : isExcluded
                                    ? "bg-red-500 text-white"
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Clear Filters */}
                {(filterYearMin || filterYearMax || filterGenres.length > 0 || excludedGenres.length > 0) && (
                  <button
                    onClick={() => {
                      setFilterYearMin("");
                      setFilterYearMax("");
                      setFilterGenres([]);
                      setExcludedGenres([]);
                      setVisibleCount(20);
                    }}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
              
                {/* Results */}
                <div className="p-2">
                  {visibleMovies.length > 0 ? (
                  <div className="space-y-1">
                    {visibleMovies.map((movie, index) => (
                      <button
                        key={movie.id}
                        onClick={() => {
                          handleGuess(movie);
                          setShowSearchModal(false);
                          setSearchQuery("");
                          setVisibleCount(20);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-3 rounded-lg ${
                          index === highlightedIndex ? "bg-slate-600" : "hover:bg-slate-700"
                        }`}
                      >
                        {movie.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title}
                            className="w-10 h-14 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-slate-700 rounded flex items-center justify-center">
                            <Film className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">
                            {movie.title}
                          </div>
                          <div className="text-slate-400 text-sm">
                            {movie.year} •{" "}
                            {(movie.genre_ids || [])
                              .map((id) => GENRE_MAP[id] || "Unknown")
                              .join(", ")}
                          </div>
                        </div>
                      </button>
                    ))}
                    
                    {/* Show More Button */}
                    {filteredMovies.length > visibleCount && (
                      <button
                        onClick={() => setVisibleCount(prev => prev + 20)}
                        className="w-full py-3 text-center text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                      >
                        Daha Fazla Göster ({filteredMovies.length - visibleCount} film kaldı)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    {searchQuery ? "Film bulunamadı" : "Film aramaya başlayın"}
                  </div>
                )}
              </div>
              </div>
            </div>
          </>
        )}

        {/* Guesses List */}
        {guesses.length > 0 && (
          <div className="mb-6 bg-slate-800 rounded-lg border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-slate-400 text-sm">Tahminler:</span>
            </div>
            <div className="space-y-2">
              {guesses.map((guess, idx) => {
                const isCorrect = guess.movie.id === targetMovie?.id;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2 rounded-lg border ${
                      isCorrect
                        ? "bg-emerald-900/20 border-emerald-500/50"
                        : "bg-slate-700/30 border-slate-700"
                    }`}
                  >
                    <div className="text-slate-500 font-mono text-sm w-4">{idx + 1}.</div>
                    
                    {/* Poster */}
                    {guess.movie.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${guess.movie.poster_path}`}
                        alt={guess.movie.title}
                        className="w-8 h-12 object-cover rounded shadow-sm"
                      />
                    ) : (
                      <div className="w-8 h-12 bg-slate-700 rounded flex items-center justify-center">
                        <Film className="w-4 h-4 text-slate-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isCorrect ? "text-emerald-400" : "text-white"}`}>
                        {guess.movie.title}
                      </div>
                      <div className="text-xs text-slate-400 whitespace-normal leading-tight">
                        {guess.movie.year} • {(guess.movie.genre_ids || [])
                          .map((id) => GENRE_MAP[id] || "Unknown")
                          .join(", ")}
                      </div>
                    </div>

                    {isCorrect ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
                        <X className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Initial State */}
        {guesses.length === 0 && gameState === "playing" && (
          <div className="text-center text-slate-400 mt-2 mb-6 bg-slate-800 rounded-lg border border-slate-700 p-8">
            <Film className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <p className="text-lg">Bir film arayarak başla!</p>
            <p className="text-sm mt-2 text-slate-500">
              Her tahmin sonrası tür ve yıl ipuçları alacaksın.
            </p>
          </div>
        )}

        {/* Hints Section */}
        {targetMovie && (
          <div className="space-y-3">
            {/* Genre Hints */}
            {guesses.length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="text-slate-300 font-medium">Türler:</span>
                {(targetMovie.genre_ids || []).map((genreId, idx) => {
                  const genreName = GENRE_MAP[genreId] || "Unknown";
                  const isRevealed = guesses.some((g) =>
                    (g.movie.genre_ids || []).includes(genreId)
                  );
                  return (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-md text-xs font-semibold uppercase ${
                        isRevealed
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-600 text-slate-300"
                      }`}
                    >
                      {isRevealed ? genreName : "?"}
                    </span>
                  );
                })}
                </div>
              </div>
            )}

            {/* Year Hint */}
            {guesses.length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-center gap-4">
                {yearRange.min !== "?" && yearRange.min === yearRange.max ? (
                  <>
                    <div className="p-2 bg-emerald-700 rounded-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold text-white">
                      = {yearRange.min}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-bold text-white">
                      {yearRange.min}
                    </span>
                    <span className="text-slate-400">&lt;</span>
                    <div className="p-2 bg-emerald-700 rounded-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <span className="text-slate-400">&lt;</span>
                    <span className="text-xl font-bold text-white">
                      {yearRange.max}
                    </span>
                  </>
                )}
                </div>
              </div>
            )}

            {/* Cast Hints */}
            {targetMovie.cast && targetMovie.cast.length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-slate-300 font-medium">Oyuncular:</span>
                  {gameState === "playing" && (
                    <button
                      onClick={() => setShowHintModal(true)}
                      disabled={hints <= 0}
                      className={`text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors font-medium ${
                        hints > 0 
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg shadow-yellow-900/20" 
                        : "bg-slate-700 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <LightBulbIcon className="w-3.5 h-3.5" />
                      İpucu ({hints})
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {targetMovie.cast.map((actor, idx) => {
                    // Sadece tahmin edilen filmlerdeki oyuncular gizli filmde de varsa onları aç
                    // İpucu ile açılan oyuncuları da aç
                    // Oyun bittiyse (kazandı veya kaybetti) hepsini aç
                    const isRevealed =
                      gameState !== "playing" ||
                      guesses.some((g) =>
                        g.movie.cast?.some((ca) => ca.id === actor.id)
                      ) ||
                      revealedActors.some((r) => r.id === actor.id);

                    // İsmi x'lerle gizle
                    const hiddenName = actor.name
                      .split(" ")
                      .map((word) =>
                        word
                          .split("")
                          .map(() => "x")
                          .join("")
                      )
                      .join(" ");

                    return (
                      <div
                        key={actor.id}
                        className={`px-3 py-2 rounded-md text-sm transition-all duration-300 ${
                          isRevealed
                            ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-700/50 text-slate-500 border border-slate-700"
                        }`}
                      >
                        {isRevealed ? actor.name : hiddenName}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

// Suspense wrapper for useSearchParams
export default function MoviedlePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <p className="text-lg">Yükleniyor...</p>
      </main>
    }>
      <Moviedle />
    </Suspense>
  );
}

