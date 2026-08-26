package com.krispyskin.mod.api;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.krispyskin.mod.client.SessionManager;
import net.minecraft.client.MinecraftClient;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

public final class KrispySkinApiClient {

    private static final String BASE_URL =
            "https://krispy-skin.vercel.app";

    private static final String SESSION_COOKIE_NAME =
            "krispy_skin_session";

    private static final HttpClient HTTP =
            HttpClient.newBuilder()
                    .followRedirects(
                            HttpClient.Redirect.NORMAL
                    )
                    .build();

    private static final Gson GSON =
            new Gson();

    private static String sessionCookie;

    private KrispySkinApiClient() {
    }

    public static boolean isLoggedIn() {
        return sessionCookie != null
                && !sessionCookie.isEmpty();
    }

    public static String getSessionCookie() {
        return sessionCookie;
    }

    public static void restoreSession(
            String session
    ) {
        if (session == null
                || session.isEmpty()) {

            sessionCookie = null;
            return;
        }

        if (!session.startsWith(
                SESSION_COOKIE_NAME + "="
        )) {
            sessionCookie = null;
            return;
        }

        sessionCookie = session;
    }

    public static LoginResult login(
            String username,
            String password
    ) {
        try {
            JsonObject body =
                    new JsonObject();

            body.addProperty(
                    "username",
                    username
            );

            body.addProperty(
                    "password",
                    password
            );

            HttpRequest request =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            BASE_URL +
                                            "/api/auth/login"
                                    )
                            )
                            .header(
                                    "Content-Type",
                                    "application/json"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers.ofString(
                                            GSON.toJson(body)
                                    )
                            )
                            .build();

            HttpResponse<String> response =
                    HTTP.send(
                            request,
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() != 200) {
                return new LoginResult(
                        false,
                        null,
                        extractError(
                                response.body()
                        )
                );
            }

            String setCookie =
                    response.headers()
                            .firstValue("set-cookie")
                            .orElse(null);

            if (setCookie == null) {
                return new LoginResult(
                        false,
                        null,
                        "Server did not return session cookie"
                );
            }

            String session =
                    extractSessionCookie(
                            setCookie
                    );

            if (session == null) {
                return new LoginResult(
                        false,
                        null,
                        "Server did not return " +
                        SESSION_COOKIE_NAME
                );
            }

            sessionCookie = session;

            saveSession();

            JsonObject json =
                    JsonParser.parseString(
                            response.body()
                    ).getAsJsonObject();

            JsonObject user =
                    json.has("user")
                            && json.get("user").isJsonObject()
                            ? json.getAsJsonObject("user")
                            : null;

            String userId =
                    user != null
                            && user.has("id")
                            ? user.get("id").getAsString()
                            : null;

            String usernameResult =
                    user != null
                            && user.has("username")
                            ? user.get("username").getAsString()
                            : username;

            return new LoginResult(
                    true,
                    new User(
                            userId,
                            usernameResult
                    ),
                    null
            );

        } catch (Exception e) {
            return new LoginResult(
                    false,
                    null,
                    e.getMessage()
            );
        }
    }

    public static LibraryResult getLibrary() {
        if (!isLoggedIn()) {
            return new LibraryResult(
                    false,
                    new ArrayList<>(),
                    null,
                    "Not logged in"
            );
        }

        try {
            HttpRequest.Builder builder =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            BASE_URL +
                                            "/api/skin/library"
                                    )
                            )
                            .GET();

            addSessionCookie(builder);

            HttpResponse<String> response =
                    HTTP.send(
                            builder.build(),
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() != 200) {

                if (response.statusCode() == 401) {
                    clearSession();
                }

                return new LibraryResult(
                        false,
                        new ArrayList<>(),
                        null,
                        extractError(
                                response.body()
                        )
                );
            }

            JsonObject json =
                    JsonParser.parseString(
                            response.body()
                    ).getAsJsonObject();

            List<Skin> skins =
                    new ArrayList<>();

            if (json.has("skins")
                    && json.get("skins").isJsonArray()) {

                JsonArray array =
                        json.getAsJsonArray(
                                "skins"
                        );

                for (int i = 0;
                     i < array.size();
                     i++) {

                    JsonObject object =
                            array.get(i)
                                    .getAsJsonObject();

                    String id =
                            getString(
                                    object,
                                    "id"
                            );

                    String filename =
                            getString(
                                    object,
                                    "filename"
                            );

                    String contentType =
                            getString(
                                    object,
                                    "contentType"
                            );

                    String model =
                            getString(
                                    object,
                                    "model"
                            );

                    long size =
                            object.has("size")
                                    ? object.get("size")
                                            .getAsLong()
                                    : 0L;

                    skins.add(
                            new Skin(
                                    id,
                                    filename,
                                    contentType,
                                    size,
                                    model
                            )
                    );
                }
            }

            String activeSkin =
                    json.has("activeSkin")
                            && !json.get("activeSkin")
                                    .isJsonNull()
                            ? json.get("activeSkin")
                                    .getAsString()
                            : null;

            return new LibraryResult(
                    true,
                    skins,
                    activeSkin,
                    null
            );

        } catch (Exception e) {
            return new LibraryResult(
                    false,
                    new ArrayList<>(),
                    null,
                    e.getMessage()
            );
        }
    }

    public static LoadSkinResult loadSkin(
            String skinId
    ) {
        if (!isLoggedIn()) {
            return new LoadSkinResult(
                    false,
                    null,
                    "Not logged in"
            );
        }

        if (skinId == null
                || skinId.isEmpty()) {

            return new LoadSkinResult(
                    false,
                    null,
                    "Skin ID is empty"
            );
        }

        try {
            JsonObject body =
                    new JsonObject();

            body.addProperty(
                    "skinId",
                    skinId
            );

            HttpRequest.Builder builder =
                    HttpRequest.newBuilder()
                            .uri(
                                    URI.create(
                                            BASE_URL +
                                            "/api/skin/load"
                                    )
                            )
                            .header(
                                    "Content-Type",
                                    "application/json"
                            )
                            .POST(
                                    HttpRequest.BodyPublishers
                                            .ofString(
                                                    GSON.toJson(body)
                                            )
                            );

            addSessionCookie(builder);

            HttpResponse<String> response =
                    HTTP.send(
                            builder.build(),
                            HttpResponse.BodyHandlers.ofString()
                    );

            if (response.statusCode() != 200) {

                if (response.statusCode() == 401) {
                    clearSession();
                }

                return new LoadSkinResult(
                        false,
                        null,
                        extractError(
                                response.body()
                        )
                );
            }

            JsonObject json =
                    JsonParser.parseString(
                            response.body()
                    ).getAsJsonObject();

            String activeSkin =
                    json.has("activeSkin")
                            && !json.get("activeSkin")
                                    .isJsonNull()
                            ? json.get("activeSkin")
                                    .getAsString()
                            : skinId;

            return new LoadSkinResult(
                    true,
                    activeSkin,
                    null
            );

        } catch (Exception e) {
            return new LoadSkinResult(
                    false,
                    null,
                    e.getMessage()
            );
        }
    }

    public static byte[] downloadSkin(
            String skinId
    ) throws IOException, InterruptedException {

        if (skinId == null
                || skinId.isEmpty()) {

            throw new IOException(
                    "Skin ID is empty"
            );
        }

        HttpRequest.Builder builder =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        BASE_URL +
                                        "/api/skin/" +
                                        skinId
                                )
                        )
                        .GET();

        if (isLoggedIn()) {
            addSessionCookie(builder);
        }

        HttpResponse<byte[]> response =
                HTTP.send(
                        builder.build(),
                        HttpResponse.BodyHandlers
                                .ofByteArray()
                );

        if (response.statusCode() != 200) {
            throw new IOException(
                    "Skin download failed: HTTP " +
                    response.statusCode()
            );
        }

        return response.body();
    }

    public static void logout() {
        clearSession();
    }

    private static void clearSession() {
        sessionCookie = null;

        try {
            MinecraftClient client =
                    MinecraftClient.getInstance();

            if (client != null) {
                SessionManager.clear(
                        client.runDirectory.toPath()
                );
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void saveSession() {
        try {
            MinecraftClient client =
                    MinecraftClient.getInstance();

            if (client != null
                    && sessionCookie != null) {

                SessionManager.save(
                        client.runDirectory.toPath(),
                        sessionCookie
                );
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String extractSessionCookie(
            String setCookie
    ) {
        String prefix =
                SESSION_COOKIE_NAME + "=";

        int start =
                setCookie.indexOf(prefix);

        if (start < 0) {
            return null;
        }

        start += prefix.length();

        int end =
                setCookie.indexOf(
                        ';',
                        start
                );

        if (end < 0) {
            end = setCookie.length();
        }

        String value =
                setCookie.substring(
                        start,
                        end
                ).trim();

        if (value.isEmpty()) {
            return null;
        }

        return prefix + value;
    }

    private static void addSessionCookie(
            HttpRequest.Builder builder
    ) {
        if (sessionCookie != null
                && !sessionCookie.isEmpty()) {

            builder.header(
                    "Cookie",
                    sessionCookie
            );
        }
    }

    private static String getString(
            JsonObject object,
            String key
    ) {
        if (!object.has(key)
                || object.get(key).isJsonNull()) {

            return null;
        }

        return object.get(key).getAsString();
    }

    private static String extractError(
            String response
    ) {
        try {
            JsonObject json =
                    JsonParser.parseString(
                            response
                    ).getAsJsonObject();

            if (json.has("error")
                    && !json.get("error").isJsonNull()) {

                return json.get("error")
                        .getAsString();
            }

            if (json.has("message")
                    && !json.get("message").isJsonNull()) {

                return json.get("message")
                        .getAsString();
            }

        } catch (Exception ignored) {
        }

        return "HTTP request failed";
    }

    public record User(
            String id,
            String username
    ) {
    }

    public record LoginResult(
            boolean success,
            User user,
            String error
    ) {
    }

    public record Skin(
            String id,
            String filename,
            String contentType,
            long size,
            String model
    ) {
    }

    public record LibraryResult(
            boolean success,
            List<Skin> skins,
            String activeSkin,
            String error
    ) {
    }

    public record LoadSkinResult(
            boolean success,
            String activeSkin,
            String error
    ) {
    }
    }
