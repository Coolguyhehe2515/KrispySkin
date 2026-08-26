package com.krispyskin.mod.client;

import com.krispyskin.mod.api.KrispySkinApiClient;
import com.krispyskin.mod.skin.SkinSelection;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;

import java.io.ByteArrayInputStream;
import java.util.concurrent.CompletableFuture;

public final class KrispySkinTextureManager {

    private static final String TEXTURE_NAMESPACE =
            "krispyskin";

    private static final String TEXTURE_PATH =
            "skins/active";

    private static Identifier activeTexture;

    private static NativeImageBackedTexture texture;

    private static String loadedSkinId;

    private static boolean loading;

    private KrispySkinTextureManager() {
    }

    public static Identifier getActiveTexture() {
        return activeTexture;
    }

    public static boolean isLoading() {
        return loading;
    }

    public static String getLoadedSkinId() {
        return loadedSkinId;
    }

    public static void loadSelectedSkin() {
        String skinId = SkinSelection.getSelectedSkinId();

        if (skinId == null || skinId.isEmpty()) {
            return;
        }

        loadSkin(skinId);
    }

    public static void loadSkin(String skinId) {
        if (skinId == null || skinId.isEmpty()) {
            return;
        }

        if (loading) {
            return;
        }

        if (skinId.equals(loadedSkinId)
                && activeTexture != null) {
            return;
        }

        loading = true;

        CompletableFuture
                .supplyAsync(() -> {
                    try {
                        return KrispySkinApiClient.downloadSkin(
                                skinId
                        );
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                })
                .thenAccept(bytes -> {
                    MinecraftClient client =
                            MinecraftClient.getInstance();

                    client.execute(() -> {
                        try {
                            applyTexture(
                                    client,
                                    skinId,
                                    bytes
                            );
                        } catch (Exception e) {
                            e.printStackTrace();
                            loading = false;
                        }
                    });
                })
                .exceptionally(throwable -> {
                    throwable.printStackTrace();
                    loading = false;
                    return null;
                });
    }

    private static void applyTexture(
            MinecraftClient client,
            String skinId,
            byte[] bytes
    ) throws Exception {

        NativeImage image =
                NativeImage.read(
                        new ByteArrayInputStream(bytes)
                );

        if (texture != null) {
            texture.close();
        }

        texture =
                new NativeImageBackedTexture(image);

        activeTexture =
                new Identifier(
                        TEXTURE_NAMESPACE,
                        TEXTURE_PATH
                );

        client.getTextureManager()
                .registerTexture(
                        activeTexture,
                        texture
                );

        loadedSkinId = skinId;
        loading = false;
    }

    public static void clear() {
        MinecraftClient client =
                MinecraftClient.getInstance();

        if (activeTexture != null) {
            client.getTextureManager()
                    .destroyTexture(activeTexture);
        }

        if (texture != null) {
            texture.close();
        }

        activeTexture = null;
        texture = null;
        loadedSkinId = null;
        loading = false;
    }
}
