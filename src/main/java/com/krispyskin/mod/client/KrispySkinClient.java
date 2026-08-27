package com.krispyskin.mod.client;

import com.krispyskin.mod.api.KrispySkinApiClient;
import com.krispyskin.mod.screen.LoginScreen;
import net.fabricmc.api.ClientModInitializer;
import net.minecraft.client.MinecraftClient;

public class KrispySkinClient
        implements ClientModInitializer {

    @Override
    public void onInitializeClient() {

        System.out.println(
                "[KrispySkin] Client initialized."
        );

        MinecraftClient client =
                MinecraftClient.getInstance();

        String session =
                SessionManager.load(
                        client.runDirectory.toPath()
                );

        if (session == null
                || session.isEmpty()) {

            System.out.println(
                    "[KrispySkin] No saved session."
            );

            client.execute(
                    () -> client.setScreen(
                            new LoginScreen(null)
                    )
            );

            return;
        }

        KrispySkinApiClient.setSessionCookie(
                session
        );

        System.out.println(
                "[KrispySkin] Session restored."
        );

        loadActiveSkin(client);
    }

    private void loadActiveSkin(
            MinecraftClient client
    ) {

        Thread thread =
                new Thread(
                        () -> {

                            KrispySkinApiClient
                                    .LibraryResult result =
                                    KrispySkinApiClient
                                            .getLibrary();

                            client.execute(
                                    () -> {

                                        if (!result.success()) {

                                            System.out.println(
                                                    "[KrispySkin] Failed to load library: "
                                                            + result.error()
                                            );

                                            return;
                                        }

                                        String activeSkin =
                                                result.activeSkin();

                                        if (activeSkin == null
                                                || activeSkin.isEmpty()) {

                                            System.out.println(
                                                    "[KrispySkin] No active skin."
                                            );

                                            return;
                                        }

                                        System.out.println(
                                                "[KrispySkin] Active skin: "
                                                        + activeSkin
                                        );

                                        KrispySkinTextureManager
                                                .setActiveSkin(
                                                        activeSkin
                                                );
                                    }
                            );
                        }
                );

        thread.setName(
                "KrispySkin-LoadActiveSkin"
        );

        thread.start();
    }
        }
