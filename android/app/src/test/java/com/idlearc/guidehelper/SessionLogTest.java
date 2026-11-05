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
