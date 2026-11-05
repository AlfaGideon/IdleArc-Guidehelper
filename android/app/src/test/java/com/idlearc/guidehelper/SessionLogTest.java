package com.idlearc.guidehelper;

import static org.junit.Assert.*;
import org.junit.Test;

public final class SessionLogTest {
    @Test public void stripsTokensPasswordsPathsAndQueries() {
        assertEquals("idlearc.com", SessionLog.host("https://idlearc.com/account/secret?token=very-secret#password"));
        assertEquals("домен скрыт", SessionLog.host("https://user:password@idlearc.com/"));
        assertEquals("домен скрыт", SessionLog.host("javascript:alert('secret')"));
        SessionLog log = new SessionLog();
        log.navigation("Открытие", "https://idlearc.com/account?token=very-secret");
        log.request("https://idlearc.com/private?password=very-secret");
        for (SessionLog.Entry item : log.snapshot()) {
            assertFalse(item.description.contains("very-secret"));
            assertFalse(item.description.contains("account"));
            assertFalse(item.description.contains("private"));
        }
    }

    @Test public void recordsSpecificClicksAndSafeNetworkMetadata() {
        SessionLog log = new SessionLog();
        log.click("BUTTON", "Инвентарь");
        log.click("A", "player@example.com");
        log.network("fetch", "POST", "https://idlearc.com/api/character/987654/items?token=TOPSECRET", 201);
        log.network("xhr", "GET", "https://other.example/private?apiKey=TOPSECRET", 403);
        log.network("ws-tx", "OTHER", "wss://idlearc.com/api/stream", 0);
        assertEquals(3, log.operations());
        StringBuilder descriptions = new StringBuilder();
        for (SessionLog.Entry item : log.snapshot()) descriptions.append(item.description).append('\n');
        String safe = descriptions.toString();
        assertTrue(safe.contains("Кнопка · Инвентарь"));
        assertTrue(safe.contains("подпись скрыта"));
        assertTrue(safe.contains("FETCH POST · idlearc.com/api/character/:id/items · HTTP 201"));
        assertTrue(safe.contains("XHR GET · other.example · HTTP 403"));
        assertTrue(safe.contains("WS → OTHER · idlearc.com/api/stream"));
        assertFalse(safe.contains("987654"));
        assertFalse(safe.contains("TOPSECRET"));
        assertFalse(safe.contains("player@example.com"));
        assertEquals("idlearc.com/[защищённый маршрут]",
            SessionLog.safeRoute("https://idlearc.com/api/auth/token?secret=1"));
    }

    @Test public void boundsMemoryAndCountsWithoutFloodingTimeline() {
        SessionLog log = new SessionLog();
        for (int i = 0; i < 900; i++) log.request("https://idlearc.com/asset-" + i);
        assertEquals(900, log.requests());
        assertTrue("timeline should be sampled rather than flooded", log.snapshot().size() <= 20);
        for (int i = 0; i < 500; i++) log.event("Действие", "Касание");
        assertEquals(SessionLog.LIMIT, log.snapshot().size());
        log.setPaused(true);
        log.request("https://idlearc.com/private");
        log.event("Действие", "Касание");
        assertEquals(900, log.requests());
        assertEquals(SessionLog.LIMIT, log.snapshot().size());
        log.clear();
        assertTrue(log.snapshot().isEmpty());
        assertEquals(0, log.requests());
    }
}
