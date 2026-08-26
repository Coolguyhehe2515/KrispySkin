package com.krispyskin.mod.client;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

public final class SessionManager {

    private static final String DIRECTORY = "krispyskin";
    private static final String FILE_NAME = "session.dat";

    private SessionManager() {
    }

    public static void save(Path runDirectory, String session) {
        if (session == null || session.isEmpty()) {
            return;
        }

        try {
            Path directory =
                    runDirectory.resolve(DIRECTORY);

            Files.createDirectories(directory);

            Files.writeString(
                    directory.resolve(FILE_NAME),
                    session,
                    StandardCharsets.UTF_8
            );

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static String load(Path runDirectory) {
        try {
            Path file =
                    runDirectory
                            .resolve(DIRECTORY)
                            .resolve(FILE_NAME);

            if (!Files.exists(file)) {
                return null;
            }

            String session =
                    Files.readString(
                            file,
                            StandardCharsets.UTF_8
                    ).trim();

            return session.isEmpty()
                    ? null
                    : session;

        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    public static void clear(Path runDirectory) {
        try {
            Path file =
                    runDirectory
                            .resolve(DIRECTORY)
                            .resolve(FILE_NAME);

            Files.deleteIfExists(file);

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
