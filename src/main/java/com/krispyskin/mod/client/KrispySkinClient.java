package com.krispyskin.mod.client;

import net.fabricmc.api.ClientModInitializer;

public class KrispySkinClient implements ClientModInitializer {

    @Override
    public void onInitializeClient() {
        System.out.println("[KrispySkin] Client initialized.");
    }
}
