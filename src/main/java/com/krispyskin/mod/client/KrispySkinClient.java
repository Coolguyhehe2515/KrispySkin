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

        if (session != null
                && !session.isEmpty()) {

            KrispySkinApiClient
                    .setSessionCookie(session);

            System.out.println(
                    "[KrispySkin] Session restored."
            );

        } else {

            System.out.println(
                    "[KrispySkin] No saved session."
            );

            client.execute(
                    () -> client.setScreen(
                            new LoginScreen(null)
                    )
            );
        }
    }
        }
