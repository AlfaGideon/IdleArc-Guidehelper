package com.idlearc.guidehelper;

import static org.junit.Assert.*;
import org.junit.Test;

public final class SessionLogTest {
    @Test public void recordsOnlyGameplayInHumanRussian() {
        SessionLog log = new SessionLog();
        log.click("BUTTON", "Inventory", 1);
        log.network("fetch", "GET", "https://idlearc.com/api/character/987654/items?token=TOPSECRET", 200, 1);
        log.network("ws-tx", "OTHER", "wss://api.idlearc.com/socket?secret=TOPSECRET", 0, 0);
        assertEquals(1, log.actions());
        assertEquals(2, log.operations());
        StringBuilder descriptions = new StringBuilder();
        for (SessionLog.Entry item : log.snapshot()) descriptions.append(item.description).append('\n');
        String text = descriptions.toString();
        assertTrue(text.contains("Вы нажали: кнопка «Инвентарь» №1"));
        assertTrue(text.contains("Игра получила данные: предметы персонажа — успешно (код 200)"));
        assertTrue(text.contains("после действия №1 (по времени)"));
        assertTrue(text.contains("Игра отправила сообщение серверу — формат не указан игрой"));
        assertFalse(text.contains("GET"));
        assertFalse(text.contains("FETCH"));
        assertFalse(text.contains("987654"));
        assertFalse(text.toString().contains("TOPSECRET"));
        assertFalse(text.contains("socket"));
    }

    @Test public void ignoresOtherSitesAndAuthData() {
        SessionLog log = new SessionLog();
        log.network("xhr", "POST", "https://accounts.google.com/auth?token=TOPSECRET", 200, 0);
        log.network("fetch", "GET", "https://idlearc.com/api/auth/token", 200, 0);
        log.network("fetch", "GET", "https://evil-idlearc.com/api/items", 200, 0);
        log.network("fetch", "GET", "http://idlearc.com/api/items", 200, 0);
        assertEquals(0, log.operations());
        assertTrue(log.snapshot().isEmpty());
        assertNull(SessionLog.safeRoute("https://idlearc.com/private?password=TOPSECRET"));
        assertNull(SessionLog.safeRoute("https://user:password@idlearc.com/api/items"));
        assertEquals("подпись скрыта", SessionLog.safeLabel("player@example.com"));
        assertEquals("подпись скрыта", SessionLog.safeLabel("1234567890"));
        assertEquals("подпись скрыта", SessionLog.safeLabel("https://example.com"));
        assertEquals("Бой", GameText.button("Battle"));
        assertEquals("Неизвестный пункт", GameText.button("Неизвестный пункт"));
    }

    @Test public void showsVerifiedItemValuesWithoutPrivateData() {
        SessionLog log = new SessionLog();
        String sword = GameText.item("Железный меч", "rare", 2, 12, 14, 0, null, 5, null, null, 12.5);
        assertEquals("Железный меч, редкость: редкая, количество: 2, уровень: 12, атака: 14, защита: 0, сила: 5, шанс критического удара: 12.5", sword);
        assertNull(GameText.item("player@example.com", "rare", 1, null, null, null, null, null, null, null, null));
        assertNull(GameText.item("TOPSECRET0123456789012345678", "rare", 1, null, null, null, null, null, null, null, null));
        log.itemDetails("https://idlearc.com/api/character/items?token=TOPSECRET", "in", 5,
                java.util.Arrays.asList(sword, "Щит, защита: 7"));
        assertTrue(log.snapshot().get(0).description.contains("показаны 2 из 5"));
        assertTrue(log.snapshot().get(0).description.contains("Железный меч"));
        assertFalse(log.snapshot().get(0).description.contains("TOPSECRET"));
        assertTrue(sword.contains("сила: 5"));
        log.itemDetails("https://idlearc.com/api/items", "in", 8,
                java.util.Arrays.asList(sword, sword, sword, sword, sword, sword));
        assertTrue(log.snapshot().get(1).description.contains("показаны 6 из 8"));
        log.itemDetails("https://other.example/api/items", "out", 1, java.util.Arrays.asList(sword));
        log.itemDetails("https://idlearc.com/api/auth/items", "out", 1, java.util.Arrays.asList(sword));
        assertEquals(2, log.snapshot().size());
        assertEquals("v0.7.0", UpdateDiscovery.tagFromRedirect(
                "https://github.com/AlfaGideon/IdleArc-Guidehelper/releases/tag/v0.7.0"));
        assertNull(UpdateDiscovery.tagFromRedirect("https://other.example/AlfaGideon/IdleArc-Guidehelper/releases/tag/v0.7.0"));
        assertNull(UpdateDiscovery.tagFromRedirect("https://github.com/AlfaGideon/IdleArc-Guidehelper/releases/tag/v0.7.0?token=x"));
        assertNull(UpdateDiscovery.apkUrl("v0.7.0/../../private"));
    }

    @Test public void automaticallyTracksOnlyGameObservationsWithoutCallingThemExploits() {
        SessionLog log = new SessionLog();
        String wallet = "https://idlearc.com/api/player/balance?token=TOPSECRET";
        log.observeBalance(wallet, "gold", 100);
        log.observeBalance(wallet, "gold", 100);
        log.observeBalance(wallet, "gold", 125);
        assertEquals(2, log.snapshot().size());
        assertTrue(log.snapshot().get(1).description.contains("изменение +25"));
        assertTrue(log.snapshot().get(1).description.contains("Причина изменения не установлена"));
        log.observeBalance("https://evil.example/api/player/balance", "gold", 999);
        log.observeBalance(wallet, "token", 123);
        log.observeBalance(wallet, "gems", -5);
        assertEquals(2, log.snapshot().size());
        String route = "https://idlearc.com/api/events/achievements";
        log.observeAchievement(route, "Goblin Hunter", "Goblin Event");
        log.observeAchievement(route, "Goblin Hunter", "Goblin Event");
        log.observeEventMismatch(route, "Goblin Hunter", "Goblin Event", "Pumpkin Event");
        log.observeEventMismatch(route, "Goblin Hunter", "Goblin Event", "Goblin Event");
        assertEquals(4, log.snapshot().size());
        assertTrue(log.snapshot().get(3).description.contains("не доказательство ошибочной награды"));
        for (SessionLog.Entry e : log.snapshot()) assertFalse(e.description.contains("TOPSECRET"));
        log.clear();
        assertTrue(log.snapshot().isEmpty());
    }

    @Test public void botAndGameFieldsNeverLogSecretsOrInventUnknownTopics() {
        SessionLog log = new SessionLog();
        log.botClick("Attack");
        log.gameFields("https://idlearc.com/api/character/reward?token=TOPSECRET",
                "in", "attack", "gold", 42, "", "");
        log.network("ws-rx", "OTHER", "wss://idlearc.com/socket", 0, 0, "binary");
        StringBuilder text = new StringBuilder();
        for (SessionLog.Entry entry : log.snapshot()) text.append(entry.description);
        assertTrue(log.snapshot().get(0).description.contains("Бот нажал игровую кнопку «Атаковать»"));
        assertTrue(log.snapshot().get(2).description.contains("золото = 42"));
        assertTrue(log.snapshot().get(3).description.contains("двоичные данные"));
        assertFalse(text.toString().contains("TOPSECRET"));
        assertEquals("маршрут игры /api/unknown", GameText.topic("/api/unknown"));
        assertNull(SessionLog.safeRoute("https://idlearc.com/api/auth/token"));
    }

    @Test public void pausesClearsAndBoundsMemory() {
        SessionLog log = new SessionLog();
        for (int i = 0; i < 900; i++) log.network("fetch", "GET", "https://idlearc.com/api/items", 200, 0);
        assertEquals(900, log.operations());
        assertTrue(log.snapshot().size() <= 24);
        for (int i = 0; i < 500; i++) log.click("BUTTON", "Battle", i + 1);
        assertEquals(500, log.actions());
        assertEquals(SessionLog.LIMIT, log.snapshot().size());
        log.setPaused(true);
        log.click("BUTTON", "Inventory", 999);
        assertEquals(500, log.actions());
        log.clear();
        assertTrue(log.snapshot().isEmpty());
        assertEquals(0, log.operations());
        assertEquals(0, log.actions());
    }
}
