import { useEffect, useMemo, useState } from "react";
import { getHistory, searchProduct } from "./api";
import "./App.css";

const translations = {
  en: {
    title: "Product Finder",
    subtitle: "Find the right Pammys product from a natural description.",
    search: "Search",
    history: "History",
    newSearch: "New search",
    searching: "Searching...",
    loadingHistory: "Loading history...",
    placeholder: "e.g. Show me Snowboots 2.0 in Nightfall, size 38",
    chooseOption: "Choose an option",
    candidates: "Possible products",
    exactMatch: "Product found",
    model: "Model",
    color: "Color",
    size: "Size",
    product: "Product",
    found: "Product found",
    needsInfo: "More information needed",
    noHistory: "No searches yet.",
    historyTitle: "Search history",
    conversation: "Conversation",
    noConversation: "Select a history entry to see the complete conversation.",
    backToSearch: "Back to search",
    error: "Something went wrong. Please try again.",
    you: "You",
    assistant: "Pammys Assistant",
  },

  de: {
    title: "Produktsuche",
    subtitle:
      "Finde das passende Pammys Produkt mit einer natürlichen Beschreibung.",
    search: "Suchen",
    history: "Verlauf",
    newSearch: "Neue Suche",
    searching: "Suche...",
    loadingHistory: "Verlauf wird geladen...",
    placeholder: "z. B. Snowboots 2.0 in Nightfall, Größe 38",
    chooseOption: "Wähle eine Option",
    candidates: "Mögliche Produkte",
    exactMatch: "Produkt gefunden",
    model: "Modell",
    color: "Farbe",
    size: "Größe",
    product: "Produkt",
    found: "Produkt gefunden",
    needsInfo: "Weitere Angaben erforderlich",
    noHistory: "Noch keine Suchanfragen.",
    historyTitle: "Suchverlauf",
    conversation: "Unterhaltung",
    noConversation:
      "Wähle einen Verlaufseintrag aus, um die Details zu sehen.",
    backToSearch: "Zurück zur Suche",
    error: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    you: "Du",
    assistant: "Pammys Assistent",
  },

  fr: {
    title: "Recherche de produits",
    subtitle:
      "Trouvez le bon produit Pammys à partir d'une description naturelle.",
    search: "Rechercher",
    history: "Historique",
    newSearch: "Nouvelle recherche",
    searching: "Recherche...",
    loadingHistory: "Chargement de l'historique...",
    placeholder: "ex. Snowboots 2.0 en Nightfall, taille 38",
    chooseOption: "Choisissez une option",
    candidates: "Produits possibles",
    exactMatch: "Produit trouvé",
    model: "Modèle",
    color: "Couleur",
    size: "Taille",
    product: "Produit",
    found: "Produit trouvé",
    needsInfo: "Informations supplémentaires requises",
    noHistory: "Aucune recherche pour le moment.",
    historyTitle: "Historique des recherches",
    conversation: "Conversation",
    noConversation:
      "Sélectionnez une entrée pour voir la conversation complète.",
    backToSearch: "Retour à la recherche",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    you: "Vous",
    assistant: "Assistant Pammys",
  },

  es: {
    title: "Buscador de productos",
    subtitle:
      "Encuentra el producto Pammys adecuado con una descripción natural.",
    search: "Buscar",
    history: "Historial",
    newSearch: "Nueva búsqueda",
    searching: "Buscando...",
    loadingHistory: "Cargando historial...",
    placeholder: "p. ej. Snowboots 2.0 en Nightfall, talla 38",
    chooseOption: "Elige una opción",
    candidates: "Productos posibles",
    exactMatch: "Producto encontrado",
    model: "Modelo",
    color: "Color",
    size: "Talla",
    product: "Producto",
    found: "Producto encontrado",
    needsInfo: "Se necesita más información",
    noHistory: "Todavía no hay búsquedas.",
    historyTitle: "Historial de búsquedas",
    conversation: "Conversación",
    noConversation:
      "Selecciona una entrada para ver la conversación completa.",
    backToSearch: "Volver a buscar",
    error: "Algo salió mal. Inténtalo de nuevo.",
    you: "Tú",
    assistant: "Asistente Pammys",
  },
};

const browserLocales = {
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};

function createSessionId() {
  return crypto.randomUUID();
}

function parseCandidates(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function collapseCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    return [];
  }

  const groups = new Map();

  candidates.forEach((candidate, index) => {
    if (!candidate) {
      return;
    }

    const key =
      candidate.image_url ||
      `${candidate.model || ""}-${candidate.color || ""}-${
        candidate.title || index
      }`;

    if (!groups.has(key)) {
      groups.set(key, {
        ...candidate,

        sizes: candidate.size
          ? [candidate.size]
          : [],
      });

      return;
    }

    const existing =
      groups.get(key);

    if (
      candidate.size &&
      !existing.sizes.includes(
        candidate.size
      )
    ) {
      existing.sizes.push(
        candidate.size
      );
    }
  });

  return [...groups.values()];
}

function getHistoryImage(item) {
  if (!item) {
    return null;
  }

  if (item.image_url) {
    return item.image_url;
  }

  const candidates =
    parseCandidates(
      item.candidate_images
    );

  return (
    candidates.find(
      (candidate) =>
        candidate.image_url
    )?.image_url || null
  );
}

function getResultType(item) {
  if (!item) {
    return "";
  }

  const value =
    item.result_type ??
    item["result_type\n"] ??
    item["result_type "] ??
    "";

  return String(value)
    .trim()
    .toLowerCase();
}

function App() {
  const [locale, setLocale] =
    useState("en");

  const [view, setView] =
    useState("search");

  const [message, setMessage] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [sessionId, setSessionId] =
    useState(createSessionId);

  const [history, setHistory] =
    useState([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    selectedSessionId,
    setSelectedSessionId,
  ] = useState(null);

  const t =
    translations[locale];

  useEffect(() => {
    refreshHistory(false);
  }, []);

  async function refreshHistory(
    showLoading = true
  ) {
    try {
      if (showLoading) {
        setHistoryLoading(true);
      }

      const rows =
        await getHistory();

      setHistory(
        Array.isArray(rows)
          ? rows
          : []
      );
    } catch (error) {
      console.error(
        "History error:",
        error
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function runSearch(
    searchMessage,
    activeSessionId = sessionId
  ) {
    const trimmed =
      String(
        searchMessage || ""
      ).trim();

    console.log(
      "runSearch called:",
      trimmed
    );

    if (!trimmed) {
      console.log(
        "Search stopped because message is empty"
      );

      return;
    }

    try {
      setLoading(true);
      setView("search");

      console.log(
        "Calling n8n..."
      );

      console.log(
        "Locale:",
        locale
      );

      console.log(
        "Session:",
        activeSessionId
      );

      const response =
        await searchProduct(
          trimmed,
          locale,
          activeSessionId
        );

      console.log(
        "RAW n8n response:",
        response
      );

      const data =
        Array.isArray(response)
          ? response[0]
          : response;

      console.log(
        "Normalized response:",
        data
      );

      if (!data) {
        throw new Error(
          "n8n returned an empty response."
        );
      }

      setResult(data);
      setMessage(trimmed);

      try {
        await refreshHistory(
          false
        );
      } catch (
        historyError
      ) {
        console.warn(
          "Search worked, but history refresh failed:",
          historyError
        );
      }
    } catch (error) {
      console.error(
        "Search error:",
        error
      );

      setResult({
        success: false,

        message:
          error?.response?.data
            ?.message ||
          error?.message ||
          t.error,

        result: null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    console.log(
      "Search button submitted"
    );

    console.log(
      "Message:",
      message
    );

    await runSearch(
      message,
      sessionId
    );
  }

  async function handleOption(
    option
  ) {
    const previousMessage =
      result?.result?.context
        ?.original_message ||
      message;

    const nextMessage =
      `${previousMessage} ${option}`.trim();

    setMessage(nextMessage);

    await runSearch(
      nextMessage,
      sessionId
    );
  }

  function startNewSearch() {
    const nextSessionId =
      createSessionId();

    setSessionId(
      nextSessionId
    );

    setMessage("");
    setResult(null);

    setSelectedSessionId(
      null
    );

    setView("search");
  }

  async function showHistory() {
    /*
      Important for mobile:
      open the history LIST first,
      not the previously selected
      conversation.
    */
    setSelectedSessionId(
      null
    );

    setView("history");

    await refreshHistory();
  }

  const structuredResult =
    result?.result || null;

  const options =
    Array.isArray(
      structuredResult?.options
    )
      ? structuredResult.options
      : [];

  const isMatch =
    structuredResult?.type ===
    "match";

  const exactProduct =
    structuredResult?.product ||
    null;

  const searchCandidates =
    useMemo(() => {
      const candidates =
        structuredResult
          ?.matched_candidates ||
        structuredResult?.context
          ?.matched_candidates ||
        structuredResult?.context
          ?.top_candidates ||
        [];

      return collapseCandidates(
        candidates
      ).slice(0, 12);
    }, [structuredResult]);

  const historyGroups =
    useMemo(() => {
      const groups =
        new Map();

      history.forEach(
        (item, index) => {
          const id =
            item.session_id ||
            `unknown-${
              item.row_number ||
              item.id ||
              index
            }`;

          if (
            !groups.has(id)
          ) {
            groups.set(
              id,
              []
            );
          }

          groups
            .get(id)
            .push(item);
        }
      );

      return [
        ...groups.entries(),
      ]
        .map(
          ([id, items]) => {
            const sortedItems =
              [...items].sort(
                (a, b) =>
                  new Date(
                    a.timestamp ||
                      0
                  ) -
                  new Date(
                    b.timestamp ||
                      0
                  )
              );

            return {
              id,

              items:
                sortedItems,

              first:
                sortedItems[0],

              latest:
                sortedItems[
                  sortedItems.length -
                    1
                ],
            };
          }
        )
        .sort(
          (a, b) =>
            new Date(
              b.latest
                ?.timestamp || 0
            ) -
            new Date(
              a.latest
                ?.timestamp || 0
            )
        );
    }, [history]);

  const selectedConversation =
    historyGroups.find(
      (group) =>
        group.id ===
        selectedSessionId
    );

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return new Intl.DateTimeFormat(
      browserLocales[locale],
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  }

  function formatTime(value) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return new Intl.DateTimeFormat(
      browserLocales[locale],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(date);
  }

  function conversationStatus(
    group
  ) {
    if (
      !group?.items?.length
    ) {
      return "question";
    }

    const hasMatch =
      group.items.some(
        (item) =>
          getResultType(
            item
          ) === "match"
      );

    if (hasMatch) {
      return "match";
    }

    /*
      Backward compatibility
      for older history rows.
    */
    const hasStoredProduct =
      group.items.some(
        (item) =>
          String(
            item.product_title ||
              ""
          ).trim() !== ""
      );

    if (
      hasStoredProduct
    ) {
      return "match";
    }

    return "question";
  }

  function renderHistoryCandidates(
    item
  ) {
    const candidates =
      collapseCandidates(
        parseCandidates(
          item.candidate_images
        )
      ).slice(0, 8);

    if (
      candidates.length === 0
    ) {
      return null;
    }

    return (
      <div className="history-candidate-grid">
        {candidates.map(
          (
            candidate,
            index
          ) => (
            <article
              className="history-candidate-card"
              key={
                candidate.id ||
                `${
                  candidate.title ||
                  candidate.model
                }-${index}`
              }
            >
              {candidate.image_url && (
                <div className="history-candidate-image">
                  <img
                    src={
                      candidate.image_url
                    }
                    alt={
                      candidate.title ||
                      candidate.model ||
                      t.product
                    }
                  />
                </div>
              )}

              <div className="history-candidate-info">
                <strong>
                  {candidate.title ||
                    candidate.model}
                </strong>

                {candidate.color && (
                  <span>
                    {
                      candidate.color
                    }
                  </span>
                )}

                {candidate.sizes
                  ?.length > 0 && (
                  <span>
                    {t.size}:{" "}
                    {candidate.sizes.join(
                      ", "
                    )}
                  </span>
                )}
              </div>
            </article>
          )
        )}
      </div>
    );
  }

  /*
    Shared by:

    - desktop history sidebar
    - mobile full-screen history list
  */
  function renderHistoryList() {
    if (historyLoading) {
      return (
        <p className="muted">
          {t.loadingHistory}
        </p>
      );
    }

    if (
      historyGroups.length ===
      0
    ) {
      return (
        <p className="muted">
          {t.noHistory}
        </p>
      );
    }

    return (
      <div className="history-list">
        {historyGroups.map(
          (group) => {
            const status =
              conversationStatus(
                group
              );

            const previewImage =
              getHistoryImage(
                group.latest
              ) ||
              getHistoryImage(
                group.first
              );

            return (
              <button
                type="button"
                key={group.id}
                className={
                  selectedSessionId ===
                  group.id
                    ? "history-card selected"
                    : "history-card"
                }
                onClick={() => {
                  setSelectedSessionId(
                    group.id
                  );

                  setView(
                    "history"
                  );
                }}
              >
                <div className="history-card-content">
                  {previewImage && (
                    <img
                      className="history-thumbnail"
                      src={
                        previewImage
                      }
                      alt=""
                    />
                  )}

                  <div className="history-card-copy">
                    <div className="history-card-top">
                      <span>
                        {formatDate(
                          group
                            .latest
                            ?.timestamp
                        )}
                      </span>

                      <span>
                        {formatTime(
                          group
                            .latest
                            ?.timestamp
                        )}
                      </span>
                    </div>

                    <strong className="history-preview">
                      {group.first
                        ?.user_message ||
                        t.search}
                    </strong>

                    <div
                      className={
                        status ===
                        "match"
                          ? "status success"
                          : "status question"
                      }
                    >
                      <span className="status-dot" />

                      {status ===
                      "match"
                        ? t.found
                        : t.needsInfo}
                    </div>
                  </div>
                </div>
              </button>
            );
          }
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            P
          </div>

          <div>
            <p className="eyebrow">
              Pammys
            </p>

            <h1>
              {t.title}
            </h1>
          </div>
        </div>

        <div className="header-actions">
          <nav className="desktop-tabs">
            <button
              type="button"
              className={
                view === "search"
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setView(
                  "search"
                )
              }
            >
              {t.search}
            </button>

            <button
              type="button"
              className={
                view === "history"
                  ? "tab active"
                  : "tab"
              }
              onClick={
                showHistory
              }
            >
              {t.history}
            </button>
          </nav>

          <nav className="mobile-tabs">
            <button
              type="button"
              className={
                view === "search"
                  ? "tab active"
                  : "tab"
              }
              onClick={() =>
                setView(
                  "search"
                )
              }
            >
              {t.search}
            </button>

            <button
              type="button"
              className={
                view === "history"
                  ? "tab active"
                  : "tab"
              }
              onClick={
                showHistory
              }
            >
              {t.history}
            </button>
          </nav>

          <select
            className="language-select"
            value={locale}
            onChange={(
              event
            ) =>
              setLocale(
                event.target
                  .value
              )
            }
            aria-label="Language"
          >
            <option value="en">
              English
            </option>

            <option value="de">
              Deutsch
            </option>

            <option value="fr">
              Français
            </option>

            <option value="es">
              Español
            </option>
          </select>
        </div>
      </header>

      <div className="dashboard">
        {/* DESKTOP HISTORY SIDEBAR */}
        <aside className="history-sidebar">
          <div className="sidebar-heading">
            <div>
              <p className="sidebar-label">
                {t.history}
              </p>

              <h2>
                {t.historyTitle}
              </h2>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={() =>
                refreshHistory()
              }
              title="Refresh history"
            >
              ↻
            </button>
          </div>

          {renderHistoryList()}
        </aside>

        <main className="main-content">
          {/* MOBILE HISTORY LIST */}
          {view === "history" &&
            !selectedConversation && (
              <section className="mobile-history-panel">
                <div className="sidebar-heading mobile-history-heading">
                  <div>
                    <p className="sidebar-label">
                      {t.history}
                    </p>

                    <h2>
                      {
                        t.historyTitle
                      }
                    </h2>
                  </div>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() =>
                      refreshHistory()
                    }
                    title="Refresh history"
                  >
                    ↻
                  </button>
                </div>

                {renderHistoryList()}
              </section>
            )}

          {/* SEARCH */}
          {view === "search" && (
            <>
              <section className="hero-panel">
                <div>
                  <p className="section-kicker">
                    Pammys Assistant
                  </p>

                  <h2>
                    {t.title}
                  </h2>

                  <p>
                    {t.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    startNewSearch
                  }
                >
                  + {t.newSearch}
                </button>
              </section>

              <form
                className="search-box"
                onSubmit={
                  handleSubmit
                }
              >
                <input
                  value={message}
                  onChange={(
                    event
                  ) =>
                    setMessage(
                      event.target
                        .value
                    )
                  }
                  placeholder={
                    t.placeholder
                  }
                  disabled={
                    loading
                  }
                />

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    loading
                  }
                >
                  {loading
                    ? t.searching
                    : t.search}
                </button>
              </form>

              {result && (
                <section className="response-section">
                  <div className="assistant-card">
                    <div className="assistant-avatar">
                      P
                    </div>

                    <div>
                      <span className="message-author">
                        {
                          t.assistant
                        }
                      </span>

                      <p>
                        {result.message ||
                          t.error}
                      </p>
                    </div>
                  </div>

                  {options.length >
                    0 && (
                    <section className="options-section">
                      <h3>
                        {
                          t.chooseOption
                        }
                      </h3>

                      <div className="option-list">
                        {options.map(
                          (
                            option,
                            index
                          ) => {
                            const label =
                              typeof option ===
                              "object"
                                ? option.model ||
                                  option.color ||
                                  option.size ||
                                  option.title ||
                                  JSON.stringify(
                                    option
                                  )
                                : String(
                                    option
                                  );

                            return (
                              <button
                                key={`${label}-${index}`}
                                type="button"
                                className="option-button"
                                disabled={
                                  loading
                                }
                                onClick={() =>
                                  handleOption(
                                    label
                                  )
                                }
                              >
                                {
                                  label
                                }
                              </button>
                            );
                          }
                        )}
                      </div>
                    </section>
                  )}

                  {!isMatch &&
                    searchCandidates.length >
                      0 && (
                      <section className="candidate-section">
                        <div className="section-heading">
                          <div>
                            <p className="section-kicker">
                              {
                                t.candidates
                              }
                            </p>

                            <h3>
                              {
                                t.candidates
                              }
                            </h3>
                          </div>

                          <span className="result-count">
                            {
                              searchCandidates.length
                            }
                          </span>
                        </div>

                        <div className="candidate-grid">
                          {searchCandidates.map(
                            (
                              candidate,
                              index
                            ) => (
                              <article
                                className="candidate-card"
                                key={
                                  candidate.id ||
                                  `${
                                    candidate.title ||
                                    candidate.model
                                  }-${index}`
                                }
                              >
                                {candidate.image_url && (
                                  <div className="candidate-image">
                                    <img
                                      src={
                                        candidate.image_url
                                      }
                                      alt={
                                        candidate.title ||
                                        candidate.model ||
                                        t.product
                                      }
                                    />
                                  </div>
                                )}

                                <div className="candidate-body">
                                  <h4>
                                    {candidate.title ||
                                      candidate.model}
                                  </h4>

                                  <div className="candidate-meta">
                                    {candidate.model && (
                                      <span>
                                        {
                                          candidate.model
                                        }
                                      </span>
                                    )}

                                    {candidate.color && (
                                      <span>
                                        {
                                          candidate.color
                                        }
                                      </span>
                                    )}

                                    {candidate.sizes?.length >
                                      0 && (
                                      <span>
                                        {
                                          t.size
                                        }
                                        :{" "}
                                        {candidate.sizes.join(
                                          ", "
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </article>
                            )
                          )}
                        </div>
                      </section>
                    )}

                  {isMatch &&
                    exactProduct && (
                      <section className="match-section">
                        <div className="section-heading">
                          <div>
                            <p className="section-kicker">
                              {
                                t.exactMatch
                              }
                            </p>

                            <h3>
                              {
                                exactProduct.title
                              }
                            </h3>
                          </div>

                          <span className="match-badge">
                            ✓
                          </span>
                        </div>

                        <article className="match-card">
                          <div className="match-image">
                            {exactProduct.image_url && (
                              <img
                                src={
                                  exactProduct.image_url
                                }
                                alt={
                                  exactProduct.title
                                }
                              />
                            )}
                          </div>

                          <div className="match-info">
                            <span className="success-pill">
                              {
                                t.found
                              }
                            </span>

                            <h3>
                              {
                                exactProduct.title
                              }
                            </h3>

                            <dl>
                              <div>
                                <dt>
                                  {
                                    t.model
                                  }
                                </dt>

                                <dd>
                                  {structuredResult
                                    ?.context
                                    ?.model ||
                                    "-"}
                                </dd>
                              </div>

                              <div>
                                <dt>
                                  {
                                    t.color
                                  }
                                </dt>

                                <dd>
                                  {structuredResult
                                    ?.context
                                    ?.color ||
                                    "-"}
                                </dd>
                              </div>

                              <div>
                                <dt>
                                  {
                                    t.size
                                  }
                                </dt>

                                <dd>
                                  {structuredResult
                                    ?.context
                                    ?.size ||
                                    "-"}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </article>
                      </section>
                    )}
                </section>
              )}
            </>
          )}

          {/* HISTORY DETAIL */}
          {view === "history" && (
            <section
              className={
                selectedConversation
                  ? "history-detail-section"
                  : "history-detail-section history-empty-detail"
              }
            >
              {!selectedConversation ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    ↺
                  </div>

                  <h2>
                    {t.historyTitle}
                  </h2>

                  <p>
                    {
                      t.noConversation
                    }
                  </p>

                  <button
                    type="button"
                    className="primary-button history-back-button"
                    onClick={() =>
                      setView(
                        "search"
                      )
                    }
                  >
                    ←{" "}
                    {
                      t.backToSearch
                    }
                  </button>
                </div>
              ) : (
                <>
                  <div className="conversation-header">
                    <div>
                      {/*
                        Mobile:
                        returns to history list.

                        Desktop:
                        clears selection
                        while keeping the
                        sidebar visible.
                      */}
                      <button
                        type="button"
                        className="back-link"
                        onClick={() =>
                          setSelectedSessionId(
                            null
                          )
                        }
                      >
                        ← {t.history}
                      </button>

                      <p className="section-kicker">
                        {
                          t.conversation
                        }
                      </p>

                      <h2>
                        {
                          selectedConversation
                            .first
                            ?.user_message
                        }
                      </h2>

                      <p className="conversation-date">
                        {formatDate(
                          selectedConversation
                            .latest
                            ?.timestamp
                        )}{" "}
                        ·{" "}
                        {formatTime(
                          selectedConversation
                            .latest
                            ?.timestamp
                        )}
                      </p>
                    </div>

                    <div
                      className={
                        conversationStatus(
                          selectedConversation
                        ) ===
                        "match"
                          ? "status success large"
                          : "status question large"
                      }
                    >
                      <span className="status-dot" />

                      {conversationStatus(
                        selectedConversation
                      ) ===
                      "match"
                        ? t.found
                        : t.needsInfo}
                    </div>
                  </div>

                  <div className="conversation-timeline">
                    {selectedConversation.items.map(
                      (
                        item,
                        index
                      ) => (
                        <article
                          className="conversation-turn"
                          key={
                            item.row_number ||
                            item.id ||
                            index
                          }
                        >
                          <div className="message user-message">
                            <span className="message-author">
                              {
                                t.you
                              }
                            </span>

                            <p>
                              {
                                item.user_message
                              }
                            </p>
                          </div>

                          {item.assistant_message && (
                            <div className="message assistant-message">
                              <span className="message-author">
                                {
                                  t.assistant
                                }
                              </span>

                              <p>
                                {
                                  item.assistant_message
                                }
                              </p>
                            </div>
                          )}

                          {item.product_title && (
                            <div className="history-product-card">
                              {item.image_url && (
                                <div className="history-product-image">
                                  <img
                                    src={
                                      item.image_url
                                    }
                                    alt={
                                      item.product_title
                                    }
                                  />
                                </div>
                              )}

                              <div className="history-product-info">
                                <span className="success-pill">
                                  {
                                    t.product
                                  }
                                </span>

                                <strong>
                                  {
                                    item.product_title
                                  }
                                </strong>
                              </div>
                            </div>
                          )}

                          {renderHistoryCandidates(
                            item
                          )}
                        </article>
                      )
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;