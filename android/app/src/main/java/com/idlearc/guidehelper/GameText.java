package com.idlearc.guidehelper;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/** Short, deliberately conservative translations: never invents an action from a URL. */
final class GameText {
    private static final Map<String, String> BUTTONS = new HashMap<>();
    private static final Map<String, String> PARTS = new HashMap<>();
    static {
        String[][] buttons = {
            {"inventory", "Инвентарь"}, {"items", "Предметы"}, {"character", "Персонаж"},
            {"equipment", "Экипировка"}, {"equip", "Надеть предмет"}, {"unequip", "Снять предмет"},
            {"skills", "Навыки"}, {"passives", "Пассивные навыки"}, {"passive tree", "Дерево пассивных навыков"},
            {"pets", "Питомцы"}, {"quests", "Задания"}, {"quest", "Задание"},
            {"battle", "Бой"}, {"fight", "Начать бой"}, {"attack", "Атаковать"},
            {"boss", "Босс"}, {"dungeon", "Подземелье"}, {"map", "Карта"},
            {"forge", "Кузница"}, {"craft", "Создать предмет"}, {"upgrade", "Улучшить"},
            {"shop", "Магазин"}, {"buy", "Купить"}, {"sell", "Продать"},
            {"collect", "Собрать"}, {"claim", "Получить награду"}, {"claim reward", "Получить награду"},
            {"start", "Начать"}, {"play", "Играть"}, {"continue", "Продолжить"},
            {"settings", "Настройки"}, {"guild", "Гильдия"}, {"farm", "Фарм"},
            {"level up", "Повысить уровень"}, {"close", "Закрыть"}, {"back", "Назад"},
            {"save", "Сохранить"}, {"confirm", "Подтвердить"}, {"cancel", "Отмена"},
            {"raid", "Рейд"}, {"raids", "Рейды"}, {"arena", "Арена"},
            {"tower", "Башня"}, {"mastery", "Мастерство"}, {"stats", "Характеристики"},
            {"chat", "Чат"}, {"leaderboard", "Таблица лидеров"}, {"market", "Рынок"},
            {"class", "Класс"}, {"battle pass", "Боевой пропуск"}, {"adventure", "Приключение"},
            {"collect all", "Собрать всё"}, {"open", "Открыть"}, {"training", "Тренировка"}
        };
        for (String[] pair : buttons) BUTTONS.put(pair[0], pair[1]);
        String[][] parts = {
            {"character", "персонаж"}, {"characters", "персонажи"}, {"player", "игрок"},
            {"inventory", "инвентарь"}, {"item", "предмет"}, {"items", "предметы"},
            {"skill", "навык"}, {"skills", "навыки"}, {"passive", "пассивные навыки"},
            {"passives", "пассивные навыки"}, {"pet", "питомец"}, {"pets", "питомцы"},
            {"battle", "бой"}, {"combat", "бой"}, {"fight", "бой"},
            {"monster", "монстр"}, {"monsters", "монстры"}, {"boss", "босс"},
            {"quest", "задание"}, {"quests", "задания"}, {"reward", "награда"},
            {"rewards", "награды"}, {"loot", "добыча"}, {"drop", "добыча"},
            {"gold", "золото"}, {"events", "события"}, {"event", "событие"},
            {"achievements", "достижения"}, {"achievement", "достижение"},
            {"wallet", "кошелёк"}, {"balance", "баланс"}, {"currency", "валюта"},
            {"resources", "ресурсы"}, {"resource", "ресурс"}, {"profile", "профиль"},
            {"notifications", "уведомления"}, {"zone", "область"}, {"explore", "исследование"},
            {"shop", "магазин"}, {"guild", "гильдия"},
            {"forge", "кузница"}, {"craft", "создание предмета"}, {"upgrade", "улучшение"},
            {"stats", "характеристики"}, {"level", "уровень"}, {"map", "карта"},
            {"dungeon", "подземелье"}, {"farm", "фарм"}
        };
        for (String[] pair : parts) PARTS.put(pair[0], pair[1]);
    }
    private GameText() {}

    static String button(String safeLabel) {
        if ("подпись скрыта".equals(safeLabel)) return "кнопка без доступного названия";
        String key = safeLabel.trim().toLowerCase(Locale.ROOT).replaceAll("\\s*\\(\\d{1,3}\\)$", "");
        String known = BUTTONS.get(key);
        if (known != null) return known;
        // Unknown text is the actual site label, not a guessed translation.
        return safeLabel;
    }

    static String topic(String safeRoute) {
        if (safeRoute == null) return "игровые данные";
        String[] pieces = safeRoute.split("/");
        java.util.Set<String> segments = new java.util.HashSet<>();
        String last = null;
        for (String piece : pieces) {
            String name = PARTS.get(piece.toLowerCase(Locale.ROOT));
            if (name != null) { segments.add(piece.toLowerCase(Locale.ROOT)); last = name; }
        }
        boolean character = segments.contains("character") || segments.contains("characters") || segments.contains("player");
        if (character && (segments.contains("items") || segments.contains("item"))) return "предметы персонажа";
        if (character && segments.contains("inventory")) return "инвентарь персонажа";
        if (character && segments.contains("stats")) return "характеристики персонажа";
        if (character && (segments.contains("skills") || segments.contains("skill"))) return "навыки персонажа";
        if ((segments.contains("quest") || segments.contains("quests")) &&
                (segments.contains("reward") || segments.contains("rewards"))) return "награды за задания";
        return last == null ? "маршрут игры " + safeRoute : last;
    }

    /** Validate again in native code: page scripts can post arbitrary messages. */
    static String item(String name, String rarity, Object qty, Object level, Object attack, Object defense, Object hp,
            Object strength, Object dexterity, Object intelligence, Object crit) {
        String safe = SessionLog.safeLabel(name);
        if ("подпись скрыта".equals(safe) || safe.length() > 48) return null;
        StringBuilder text = new StringBuilder(safe);
        String r = SessionLog.safeLabel(rarity);
        if (!"подпись скрыта".equals(r) && r.length() <= 48) {
            String known;
            switch (r.toLowerCase(Locale.ROOT)) {
                case "common": known = "обычная"; break;
                case "uncommon": known = "необычная"; break;
                case "rare": known = "редкая"; break;
                case "epic": known = "эпическая"; break;
                case "legendary": known = "легендарная"; break;
                default: known = r;
            }
            text.append(", редкость: ").append(known);
        }
        appendStat(text, "количество", qty);
        appendStat(text, "уровень", level);
        appendStat(text, "атака", attack);
        appendStat(text, "защита", defense);
        appendStat(text, "здоровье", hp);
        appendStat(text, "сила", strength);
        appendStat(text, "ловкость", dexterity);
        appendStat(text, "интеллект", intelligence);
        appendStat(text, "шанс критического удара", crit);
        return text.toString();
    }
    private static void appendStat(StringBuilder text, String title, Object number) {
        if (!(number instanceof Number)) return;
        double value = ((Number) number).doubleValue();
        if (Double.isFinite(value) && value >= 0 && value <= 1000000)
            text.append(", ").append(title).append(": ").append(value == Math.rint(value)
                    ? String.valueOf((long) value) : String.valueOf(value));
    }

    static String result(int code) {
        if (code >= 200 && code < 300) return "успешно";
        if (code == 401 || code == 403) return "доступ не разрешён";
        if (code == 404) return "данные не найдены";
        if (code >= 500 && code <= 599) return "ошибка сервера";
        if (code >= 400) return "запрос отклонён";
        return "ответ не получен";
    }
}
