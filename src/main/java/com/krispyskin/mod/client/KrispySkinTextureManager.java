package com.krispyskin.mod.client;

import com.krispyskin.mod.api.KrispySkinApiClient;
import com.krispyskin.mod.skin.SkinSelection;
import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.render.entity.EntityRenderDispatcher;
import net.minecraft.client.texture.NativeImage;
import net.minecraft.client.texture.NativeImageBackedTexture;
import net.minecraft.util.Identifier;
import net.minecraft.util.math.RotationAxis;

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

    private static String activeSkinId;

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

    public static String getActiveSkinId() {
        return activeSkinId;
    }

    public static void setActiveSkin(String skinId) {
        if (skinId == null || skinId.isEmpty()) {
            return;
        }

        activeSkinId = skinId;

        SkinSelection.setSelectedSkinId(skinId);

        loadSkin(skinId);
    }

    public static void loadSelectedSkin() {
        String skinId = SkinSelection.getSelectedSkinId();

        if (skinId == null || skinId.isEmpty()) {
            return;
        }

        activeSkinId = skinId;

        loadSkin(skinId);
    }

    public static void loadSkin(String skinId) {
        if (skinId == null || skinId.isEmpty()) {
            return;
        }

        if (skinId.equals(loadedSkinId)
                && activeTexture != null) {
            return;
        }

        if (loading) {
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
        activeSkinId = skinId;
        loading = false;
    }

    public static void refreshPlayerSkin(
            ClientPlayerEntity player
    ) {
        if (player == null) {
            return;
        }

        String skinId = activeSkinId;

        if (skinId == null || skinId.isEmpty()) {
            skinId = SkinSelection.getSelectedSkinId();
        }

        if (skinId == null || skinId.isEmpty()) {
            return;
        }

        if (!skinId.equals(loadedSkinId)) {
            loadSkin(skinId);
        }
    }

    public static void renderPreview(
            DrawContext context,
            ClientPlayerEntity player,
            int x,
            int y,
            int size
    ) {
        MinecraftClient client =
                MinecraftClient.getInstance();

        if (player == null) {
            return;
        }

        EntityRenderDispatcher dispatcher =
                client.getEntityRenderDispatcher();

        float oldYaw =
                player.getYaw();

        float oldBodyYaw =
                player.getBodyYaw();

        float oldHeadYaw =
                player.getHeadYaw();

        float oldPrevHeadYaw =
                player.prevHeadYaw;

        float oldPrevBodyYaw =
                player.prevBodyYaw;

        context.getMatrices().push();

        context.getMatrices().translate(
                x,
                y,
                1050.0F
        );

        context.getMatrices().scale(
                size,
                size,
                size
        );

        context.getMatrices().multiply(
                RotationAxis.POSITIVE_Z.rotationDegrees(
                        180.0F
                )
        );

        context.getMatrices().translate(
                0.0F,
                -1.0F,
                0.0F
        );

        player.setYaw(180.0F);
        player.setBodyYaw(180.0F);
        player.setHeadYaw(180.0F);

        player.prevHeadYaw = 180.0F;
        player.prevBodyYaw = 180.0F;

        RenderSystem.enableDepthTest();

        dispatcher.render(
                player,
                0.0D,
                0.0D,
                0.0D,
                0.0F,
                1.0F,
                context.getMatrices(),
                client.getBufferBuilders()
                        .getEntityVertexConsumers(),
                15728880
        );

        client.getBufferBuilders()
                .getEntityVertexConsumers()
                .draw();

        RenderSystem.disableDepthTest();

        context.getMatrices().pop();

        player.setYaw(oldYaw);
        player.setBodyYaw(oldBodyYaw);
        player.setHeadYaw(oldHeadYaw);

        player.prevHeadYaw = oldPrevHeadYaw;
        player.prevBodyYaw = oldPrevBodyYaw;
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
        activeSkinId = null;
        loading = false;
    }
}
