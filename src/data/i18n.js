/*!
 * Packet Clicker - I18N (UMD)
 * Provides hardcoded dictionaries and helpers for en, pt-br, ru.
 *
 * Usage (global):
 *   // Read/Set language
 *   Packet.i18n.getLanguage(); // -> 'en' (default)
 *   Packet.i18n.setLanguage('pt-br'); // persists, dispatches 'packet:i18n:change'
 *
 *   // Translate
 *   Packet.i18n.t('tabs.game'); // -> "Game" (or localized)
 *   Packet.i18n.t('prestige.prestigeNow', { n: 12 }); // interpolation
 *
 *   // Optional: localize known global data catalogs (names/descriptions)
 *   Packet.i18n.applyLanguageToData();
 *
 * This module never throws; it fails safe and falls back to English or key.
 */
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], function () {
      return factory(root);
    });
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    root.Packet = root.Packet || {};
    root.Packet.i18n = factory(root);
  }
})(typeof self !== "undefined" ? self : this, function (g) {
  "use strict";

  var LS_KEY =
    (g.Packet &&
      g.Packet.data &&
      (g.Packet.data.STORAGE_KEY || "").replace(/_save_.+$/, "_lang")) ||
    "packet_clicker_lang";

  var DEFAULT_LANG = "en";
  var SUPPORTED = ["en", "pt-br", "ru"];

  // Simple deep get with "a.b.c" path
  function getPath(obj, path) {
    if (!obj || !path) return undefined;
    var cur = obj;
    var parts = String(path).split(".");
    for (var i = 0; i < parts.length; i++) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, parts[i])) {
        cur = cur[parts[i]];
      } else {
        return undefined;
      }
    }
    return cur;
  }

  // Tiny template interpolation: "Hello {name}"
  function format(str, params) {
    if (!str || !params) return str;
    return String(str).replace(/\{(\w+)\}/g, function (_, k) {
      return Object.prototype.hasOwnProperty.call(params, k)
        ? String(params[k])
        : "{" + k + "}";
    });
  }

  // Detect valid lang or fallback
  function normalizeLang(lang) {
    if (!lang) return DEFAULT_LANG;
    var l = String(lang).toLowerCase();
    if (SUPPORTED.indexOf(l) >= 0) return l;
    // accept "pt" -> "pt-br"
    if (l === "pt") return "pt-br";
    if (l.startsWith("pt-")) return "pt-br";
    if (l.startsWith("ru")) return "ru";
    return DEFAULT_LANG;
  }

  function getLanguage() {
    try {
      var stored = g.localStorage && g.localStorage.getItem(LS_KEY);
      if (stored) return normalizeLang(stored);
    } catch (_) {}
    // try navigator
    try {
      var nav =
        (g.navigator && (g.navigator.language || g.navigator.userLanguage)) ||
        "";
      return normalizeLang(nav);
    } catch (_) {}
    return DEFAULT_LANG;
  }

  function setLanguage(lang) {
    var l = normalizeLang(lang);
    try {
      g.localStorage && g.localStorage.setItem(LS_KEY, l);
    } catch (_) {}
    // Reflect <html lang="..">
    try {
      if (g.document && g.document.documentElement) {
        g.document.documentElement.setAttribute("lang", l);
      }
    } catch (_) {}
    // Notify listeners
    try {
      var evt;
      if (typeof g.CustomEvent === "function") {
        evt = new g.CustomEvent("packet:i18n:change", { detail: { lang: l } });
      } else {
        evt = g.document.createEvent("Event");
        evt.initEvent("packet:i18n:change", true, true);
      }
      g.dispatchEvent(evt);
    } catch (_) {}
    return l;
  }

  // Translation dictionaries
  var dict = {
    en: {
      tabs: {
        game: "Game",
        upgrades: "Upgrades",
        achievements: "Achievements",
        shop: "Shop",
        leaderboard: "Leaderboard",
        prestige: "Prestige",
        daily: "Daily Rewards",
        boosts: "Temporary Boosts",
        themes: "Themes",
      },
      buttons: {
        collect: "Collect Packets",
        prestigeAvailable: "⭐ Prestige Available",
        prestigeNow: "Prestige Now! (+{n} 🔷)",
        save: "Save",
        editProfile: "Edit Profile",
        claimDaily: "Claim Day {n} Reward!",
      },
      labels: {
        packetsPerClick: "Packets/Click",
        packetsPerSec: "Packets/Sec",
        critChance: "Crit Chance",
        critMultiplier: "Crit Multiplier",
        level: "Level",
        dataShards: "Data Shards",
        streak: "Streak",
        day: "Day",
        version: "Version",
        adBanner: "Ad Banner (Remove in Shop)",
      },
      settings: {
        title: "Settings",
        sfx: "Game Sound Effects",
        graphics: "Graphics Quality",
        graphicsHigh: "High (Default)",
        graphicsMedium: "Medium (Reduced Effects)",
        graphicsLow: "Low (Minimal Effects)",
        graphicsNote: "Lower settings improve performance on older devices",
        note: "All progress is saved locally.<br>For mobile, use Store in-app for real gems/ads!",
      },
      profile: {
        title: "Edit Profile",
        name: "Name:",
        avatar: "Avatar:",
        save: "Save",
        updated: "Profile updated!",
      },
      prestige: {
        title: "⭐ Prestige",
        prestigeNow: "Prestige Now! (+{n} 🔷)",
        resetHint: "Reset progress for permanent bonuses",
        need: "Need 50,000 packets to prestige",
        current: "Current: {curr}",
        levelUp: "Prestige Level {level}!",
      },
      boosts: {
        title: "⚡ Temporary Boosts",
        available: "Available Boosts",
        stackHint: "Boosts stack with other bonuses for maximum effect!",
      },
      daily: {
        title: "Daily Rewards",
        comeBack: "Come back tomorrow for next reward!",
      },
      events: {
        packetRain: {
          name: "Packet Rain",
          desc: "Raining packets for 60s",
        },
        bonusPackets: {
          name: "Bonus Packets",
          desc: "You gained {n} packets!",
        },
        gemRush: {
          name: "Gem Rush",
          desc: "Gems appear more often for 60s",
        },
        upgradeDiscount: {
          name: "Upgrade Sale!",
          desc: "50% off all upgrades for 3 minutes",
        },
      },
      notify: {
        luckyClick: "LUCKY CLICK! 10x",
        gemsFound: "+{gems} 💎 (Found!)",
        boostActivated: "{name} activated!",
        upgraded: "{name} upgraded!",
      },
      modals: {
        errorTitle: "Error",
        errorCorrupt:
          "Save data was corrupted and has been reset.<br>Starting a new game.",
        updatedTitle: "Game Updated",
        updatedBody:
          "Old save was incompatible and has been reset.<br>Enjoy the new version!",
      },
    },

    "pt-br": {
      tabs: {
        game: "Jogo",
        upgrades: "Melhorias",
        achievements: "Conquistas",
        shop: "Loja",
        leaderboard: "Ranking",
        prestige: "Prestígio",
        daily: "Recompensas Diárias",
        boosts: "Boosts Temporários",
        themes: "Temas",
      },
      buttons: {
        collect: "Coletar Pacotes",
        prestigeAvailable: "⭐ Prestígio Disponível",
        prestigeNow: "Prestigiar Agora! (+{n} 🔷)",
        save: "Salvar",
        editProfile: "Editar Perfil",
        claimDaily: "Resgatar Recompensa do Dia {n}!",
      },
      labels: {
        packetsPerClick: "Pacotes/Clique",
        packetsPerSec: "Pacotes/Seg",
        critChance: "Chance de Crítico",
        critMultiplier: "Multiplicador de Crítico",
        level: "Nível",
        dataShards: "Fragmentos de Dados",
        streak: "Sequência",
        day: "Dia",
        version: "Versão",
        adBanner: "Banner de Anúncio (Remova na Loja)",
      },
      settings: {
        title: "Configurações",
        sfx: "Efeitos Sonoros do Jogo",
        graphics: "Qualidade Gráfica",
        graphicsHigh: "Alta (Padrão)",
        graphicsMedium: "Média (Efeitos Reduzidos)",
        graphicsLow: "Baixa (Efeitos Mínimos)",
        graphicsNote:
          "Configurações menores melhoram performance em dispositivos antigos",
        note: "Todo progresso é salvo localmente.<br>No mobile, use a Loja do app para gemas/anúncios reais!",
      },
      profile: {
        title: "Editar Perfil",
        name: "Nome:",
        avatar: "Avatar:",
        save: "Salvar",
        updated: "Perfil atualizado!",
      },
      prestige: {
        title: "⭐ Prestígio",
        prestigeNow: "Prestrigiar Agora! (+{n} 🔷)",
        resetHint: "Resetar progresso por bônus permanentes",
        need: "Precisa de 50.000 pacotes para prestigiar",
        current: "Atual: {curr}",
        levelUp: "Nível de Prestígio {level}!",
      },
      boosts: {
        title: "⚡ Boosts Temporários",
        available: "Boosts disponíveis",
        stackHint: "Boosts acumulam com outros bônus para efeito máximo!",
      },
      daily: {
        title: "📅 Recompensas Diárias",
        comeBack: "Volte amanhã para a próxima recompensa!",
      },
      events: {
        packetRain: {
          name: "Chuva de Pacotes",
          desc: "Chovendo pacotes por 60s",
        },
        bonusPackets: {
          name: "Pacotes Bônus",
          desc: "Você ganhou {n} pacotes!",
        },
        gemRush: {
          name: "Corrida de Gemas",
          desc: "Gemas aparecem com mais frequência por 60s",
        },
        upgradeDiscount: {
          name: "Promoção de Melhorias!",
          desc: "50% de desconto em todas as melhorias por 3 minutos",
        },
      },
      notify: {
        luckyClick: "CLIQUE DA SORTE! 10x",
        gemsFound: "+{gems} 💎 (Encontrado!)",
        boostActivated: "{name} ativado!",
        upgraded: "{name} melhorado!",
      },
      modals: {
        errorTitle: "Erro",
        errorCorrupt:
          "Os dados do save foram corrompidos e foram resetados.<br>Iniciando um novo jogo.",
        updatedTitle: "Jogo Atualizado",
        updatedBody:
          "O save antigo era incompatível e foi resetado.<br>Aproveite a nova versão!",
      },
    },

    ru: {
      tabs: {
        game: "Игра",
        upgrades: "Улучшения",
        achievements: "Достижения",
        shop: "Магазин",
        leaderboard: "Таблица лидеров",
        prestige: "Престиж",
        daily: "Ежедневные награды",
        boosts: "Временные бусты",
        themes: "Темы",
      },
      buttons: {
        collect: "Собрать пакеты",
        prestigeAvailable: "⭐ Доступен престиж",
        prestigeNow: "Престиж сейчас! (+{n} 🔷)",
        save: "Сохранить",
        editProfile: "Редактировать профиль",
        claimDaily: "Забрать награду за день {n}!",
      },
      labels: {
        packetsPerClick: "Пакеты/клик",
        packetsPerSec: "Пакеты/сек",
        critChance: "Шанс крит.",
        critMultiplier: "Множитель крит.",
        level: "Уровень",
        dataShards: "Дата-осколки",
        streak: "Серия",
        day: "День",
        version: "Версия",
        adBanner: "Рекламный баннер (удалить в магазине)",
      },
      settings: {
        title: "Настройки",
        sfx: "Звуковые эффекты игры",
        graphics: "Качество графики",
        graphicsHigh: "Высокое (По умолчанию)",
        graphicsMedium: "Среднее (Уменьшенные эффекты)",
        graphicsLow: "Низкое (Минимальные эффекты)",
        graphicsNote:
          "Более низкие настройки улучшают производительность на старых устройствах",
        note: "Весь прогресс сохраняется локально.<br>На мобильных используйте магазин приложения для настоящих гемов/рекламы!",
      },
      profile: {
        title: "Редактировать профиль",
        name: "Имя:",
        avatar: "Аватар:",
        save: "Сохранить",
        updated: "Профиль обновлён!",
      },
      prestige: {
        title: "⭐ Престиж",
        prestigeNow: "Престиж сейчас! (+{n} 🔷)",
        resetHint: "Сброс прогресса за постоянные бонусы",
        need: "Нужно 50 000 пакетов для престижа",
        current: "Текущие: {curr}",
        levelUp: "Уровень престижа {level}!",
      },
      boosts: {
        title: "⚡ Временные бусты",
        available: "Доступные бусты",
        stackHint:
          "Бусты суммируются с другими бонусами для максимального эффекта!",
      },
      daily: {
        title: "📅 Ежедневные награды",
        comeBack: "Возвращайтесь завтра за следующей наградой!",
      },
      events: {
        packetRain: {
          name: "Дождь пакетов",
          desc: "Пакеты сыпятся 60с",
        },
        bonusPackets: {
          name: "Бонусные пакеты",
          desc: "Вы получили {n} пакетов!",
        },
        gemRush: {
          name: "Всплеск гемов",
          desc: "Гемы появляются чаще в течение 60с",
        },
        upgradeDiscount: {
          name: "Распродажа улучшений!",
          desc: "Скидка 50% на все улучшения на 3 минуты",
        },
      },
      notify: {
        luckyClick: "УДАЧНЫЙ КЛИК! 10x",
        gemsFound: "+{gems} 💎 (Найдены!)",
        boostActivated: "{name} активирован!",
        upgraded: "{name} улучшено!",
      },
      modals: {
        errorTitle: "Ошибка",
        errorCorrupt:
          "Данные сохранения повреждены и были сброшены.<br>Начинаем новую игру.",
        updatedTitle: "Игра обновлена",
        updatedBody:
          "Старое сохранение несовместимо и было сброшено.<br>Наслаждайтесь новой версией!",
      },
    },
  };

  // Optional: map catalog ids to localized name/desc
  var catalogMap = {
    prestigeUpgrades: {
      // id -> { name, desc }
      autoClicker: {
        en: { name: "Auto Clicker", desc: "Clicks 1/sec automatically" },
        "pt-br": {
          name: "Auto Clique",
          desc: "Clica 1/seg automaticamente",
        },
        ru: { name: "Автокликер", desc: "Автоклик 1/сек" },
      },
      packetBoost: {
        en: { name: "Packet Multiplier", desc: "+10% packet gain per level" },
        "pt-br": {
          name: "Multiplicador de Pacotes",
          desc: "+10% pacotes por nível",
        },
        ru: {
          name: "Множитель пакетов",
          desc: "+10% пакетов за уровень",
        },
      },
      gemFind: {
        en: { name: "Gem Hunter", desc: "5% chance to find gems on click" },
        "pt-br": {
          name: "Caçador de Gemas",
          desc: "5% de chance de achar gemas ao clicar",
        },
        ru: { name: "Охотник за гемами", desc: "5% найти гем при клике" },
      },
      critBoost: {
        en: { name: "Critical Master", desc: "+5% crit chance per level" },
        "pt-br": {
          name: "Mestre do Crítico",
          desc: "+5% de chance de crítico por nível",
        },
        ru: { name: "Мастер крита", desc: "+5% шанс крита за уровень" },
      },
      offlineEarnings: {
        en: { name: "Offline Earnings", desc: "Earn while away" },
        "pt-br": {
          name: "Ganhos Offline",
          desc: "Ganhe enquanto estiver fora",
        },
        ru: { name: "Доход офлайн", desc: "Заработок в отсутствие" },
      },
      luckyClicks: {
        en: { name: "Lucky Clicks", desc: "Chance for 10x clicks" },
        "pt-br": { name: "Cliques da Sorte", desc: "Chance de cliques 10x" },
        ru: { name: "Удачные клики", desc: "Шанс 10x клика" },
      },
      megaCrits: {
        en: { name: "Mega Crits", desc: "Crits give 3x instead of 2x" },
        "pt-br": {
          name: "Mega Críticos",
          desc: "Críticos dão 3x em vez de 2x",
        },
        ru: { name: "Мега-криты", desc: "Крит 3x вместо 2x" },
      },
    },
    boosts: {
      doublePackets: {
        en: { name: "2x Packets", desc: "Double packet gain" },
        "pt-br": { name: "2x Pacotes", desc: "Dobra os pacotes ganhos" },
        ru: { name: "2x Пакеты", desc: "Двойной прирост пакетов" },
      },
      tripleGems: {
        en: { name: "3x Gems", desc: "Triple gem find chance" },
        "pt-br": { name: "3x Gemas", desc: "Triplica chance de gemas" },
        ru: { name: "3x Гемы", desc: "Тройной шанс гемов" },
      },
      quadrupleClick: {
        en: { name: "4x Click Power", desc: "Quadruple click power" },
        "pt-br": { name: "4x Poder de Clique", desc: "Quadruplica o clique" },
        ru: { name: "4x Сила клика", desc: "В 4 раза сильнее клик" },
      },
      megaCrit: {
        en: { name: "Mega Crit Mode", desc: "50% crit chance for 2 minutes" },
        "pt-br": {
          name: "Modo Mega Crítico",
          desc: "50% de crítico por 2 minutos",
        },
        ru: { name: "Режим мегакрита", desc: "50% крит. на 2 минуты" },
      },
      autoClicker: {
        en: { name: "Auto-Clicker", desc: "Adds +10/s auto-clicking" },
        "pt-br": { name: "Auto-Clique", desc: "Adiciona +10/seg de clique" },
        ru: { name: "Автокликер", desc: "Добавляет +10/с автоклика" },
      },
    },
    randomEvents: {
      packetRain: {
        en: { name: "Packet Rain", desc: "Raining packets for 60s" },
        "pt-br": { name: "Chuva de Pacotes", desc: "Chovendo pacotes por 60s" },
        ru: { name: "Дождь пакетов", desc: "Пакеты сыпятся 60с" },
      },
      bonusPackets: {
        en: { name: "Bonus Packets", desc: "You gained {n} packets!" },
        "pt-br": { name: "Pacotes Bônus", desc: "Você ganhou {n} pacotes!" },
        ru: { name: "Бонусные пакеты", desc: "Вы получили {n} пакетов!" },
      },
      gemRush: {
        en: { name: "Gem Rush", desc: "Gems appear more often for 60s" },
        "pt-br": {
          name: "Corrida de Gemas",
          desc: "Gemas aparecem com mais frequência por 60s",
        },
        ru: { name: "Всплеск гемов", desc: "Гемы чаще в течение 60с" },
      },
      upgradeDiscount: {
        en: {
          name: "Upgrade Sale!",
          desc: "50% off all upgrades for 3 minutes",
        },
        "pt-br": {
          name: "Promoção de Melhorias!",
          desc: "50% de desconto em todas as melhorias por 3 minutos",
        },
        ru: {
          name: "Распродажа улучшений!",
          desc: "Скидка 50% на все улучшения на 3 минуты",
        },
      },
    },
  };

  function t(key, params, lang) {
    var l = normalizeLang(lang || getLanguage());
    var value = getPath(dict[l], key);
    if (value == null) {
      // fallback to English
      value = getPath(dict.en, key);
      if (value == null) return key;
    }
    if (params) return format(value, params);
    return value;
  }

  // Optional: translate known global content arrays in-place if present
  function applyLanguageToData(lang) {
    var l = normalizeLang(lang || getLanguage());

    // Helper to patch array items by id
    function patchArray(arr, map) {
      if (!arr || !map) return;
      try {
        for (var i = 0; i < arr.length; i++) {
          var it = arr[i];
          if (!it || !it.id || !map[it.id]) continue;
          var loc = map[it.id][l] || map[it.id].en;
          if (loc && loc.name) it.name = loc.name;
          if (loc && loc.desc && typeof it.desc === "string")
            it.desc = loc.desc;
        }
      } catch (_) {}
    }

    try {
      // Globals (non-module)
      if (g.PRESTIGE_UPGRADES && Array.isArray(g.PRESTIGE_UPGRADES)) {
        patchArray(g.PRESTIGE_UPGRADES, catalogMap.prestigeUpgrades);
      }
      if (g.BOOST_SHOP && Array.isArray(g.BOOST_SHOP)) {
        patchArray(g.BOOST_SHOP, catalogMap.boosts);
      }
      if (g.RANDOM_EVENTS && Array.isArray(g.RANDOM_EVENTS)) {
        // RANDOM_EVENTS sometimes has 'type' and 'name'/'desc'
        var re = g.RANDOM_EVENTS;
        for (var j = 0; j < re.length; j++) {
          var ev = re[j];
          if (!ev || !ev.type) continue;
          var loc =
            (catalogMap.randomEvents[ev.type] &&
              (catalogMap.randomEvents[ev.type][l] ||
                catalogMap.randomEvents[ev.type].en)) ||
            null;
          if (loc) {
            if (loc.name) ev.name = loc.name;
            if (loc.desc && typeof ev.desc === "string") ev.desc = loc.desc;
          }
        }
      }
      // Packet.data mirror (UMD constants)
      if (g.Packet && g.Packet.data) {
        if (
          g.Packet.data.PRESTIGE_UPGRADES &&
          Array.isArray(g.Packet.data.PRESTIGE_UPGRADES)
        ) {
          patchArray(
            g.Packet.data.PRESTIGE_UPGRADES,
            catalogMap.prestigeUpgrades,
          );
        }
        if (
          g.Packet.data.BOOST_SHOP &&
          Array.isArray(g.Packet.data.BOOST_SHOP)
        ) {
          patchArray(g.Packet.data.BOOST_SHOP, catalogMap.boosts);
        }
        if (
          g.Packet.data.RANDOM_EVENTS &&
          Array.isArray(g.Packet.data.RANDOM_EVENTS)
        ) {
          var re2 = g.Packet.data.RANDOM_EVENTS;
          for (var k = 0; k < re2.length; k++) {
            var ev2 = re2[k];
            if (!ev2 || !ev2.type) continue;
            var loc2 =
              (catalogMap.randomEvents[ev2.type] &&
                (catalogMap.randomEvents[ev2.type][l] ||
                  catalogMap.randomEvents[ev2.type].en)) ||
              null;
            if (loc2) {
              if (loc2.name) ev2.name = loc2.name;
              if (loc2.desc && typeof ev2.desc === "string")
                ev2.desc = loc2.desc;
            }
          }
        }
      }
    } catch (_) {}
  }

  // Translate elements with data-i18n="path.to.key" and optional data-i18n-attr="title"
  function translateDom(root, lang) {
    var l = normalizeLang(lang || getLanguage());
    try {
      var scope = root || (g.document && g.document.body);
      if (!scope || !scope.querySelectorAll) return;
      var nodes = scope.querySelectorAll("[data-i18n]");
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        var key = el.getAttribute("data-i18n");
        var attr = el.getAttribute("data-i18n-attr");
        var text = t(key, null, l);
        if (attr) {
          el.setAttribute(attr, text);
        } else {
          el.innerHTML = text; // allow <br> in strings like settings.note
        }
      }
    } catch (_) {}
  }

  // Expose a safe global "t" if none exists
  if (!g.t) {
    try {
      g.t = function (key, params) {
        return t(key, params);
      };
    } catch (_) {}
  }

  // Initialize <html lang=".."> for current language
  try {
    if (g.document && g.document.documentElement) {
      g.document.documentElement.setAttribute("lang", getLanguage());
    }
  } catch (_) {}

  return {
    SUPPORTED: SUPPORTED.slice(),
    dict: dict,
    t: t,
    getLanguage: getLanguage,
    setLanguage: function (lang) {
      var l = setLanguage(lang);
      applyLanguageToData(l);
      return l;
    },
    translateDom: translateDom,
    applyLanguageToData: applyLanguageToData,
  };
});
