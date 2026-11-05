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
        assertTrue(text.contains("Игра отправила сообщение серверу (содержимое скрыто)"));
        assertFalse(text.contains("GET"));
        assertFalse(text.contains("FETCH"));
        assertFalse(text.contains("987654"));
        assertFalse(text.contains("TOPSECRET"));
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
