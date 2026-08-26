package com.krispyskin.mod.client;

import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.render.entity.EntityRenderDispatcher;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.RotationAxis;

public final class PlayerPreviewRenderer {

    private static float rotation = 180.0F;

    private static boolean controlsEnabled = false;

    private PlayerPreviewRenderer() {
    }

    public static void render(
            MatrixStack matrices,
            int x,
            int y,
            int size
    ) {
        MinecraftClient client =
                MinecraftClient.getInstance();

        ClientPlayerEntity player =
                client.player;

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

        matrices.push();

        RenderSystem.enableDepthTest();

        matrices.translate(
                x,
                y,
                1050.0F
        );

        matrices.scale(
                size,
                size,
                size
        );

        matrices.multiply(
                RotationAxis.POSITIVE_Z.rotationDegrees(
                        180.0F
                )
        );

        matrices.translate(
                0.0F,
                -1.0F,
                0.0F
        );

        matrices.multiply(
                RotationAxis.POSITIVE_Y.rotationDegrees(
                        rotation
                )
        );

        /*
         * Use a fixed pose for the preview.
         * This prevents the paperdoll from following
         * the player's current head/body rotation.
         */
        player.setYaw(0.0F);
        player.setBodyYaw(0.0F);
        player.setHeadYaw(0.0F);

        player.prevHeadYaw = 0.0F;
        player.prevBodyYaw = 0.0F;

        /*
         * Render the actual player so the current
         * KrispySkin texture remains available.
         *
         * Armor/item visibility is handled by the
         * preview mixins separately.
         */
        dispatcher.render(
                player,
                0.0D,
                0.0D,
                0.0D,
                0.0F,
                1.0F,
                matrices,
                client.getBufferBuilders()
                        .getEntityVertexConsumers(),
                15728880
        );

        client.getBufferBuilders()
                .getEntityVertexConsumers()
                .draw();

        matrices.pop();

        RenderSystem.disableDepthTest();

        player.setYaw(oldYaw);
        player.setBodyYaw(oldBodyYaw);
        player.setHeadYaw(oldHeadYaw);

        player.prevHeadYaw =
                oldPrevHeadYaw;

        player.prevBodyYaw =
                oldPrevBodyYaw;
    }

    public static void rotateLeft() {
        rotation -= 10.0F;

        normalizeRotation();
    }

    public static void rotateRight() {
        rotation += 10.0F;

        normalizeRotation();
    }

    public static float getRotation() {
        return rotation;
    }

    public static void setRotation(
            float value
    ) {
        rotation = value;

        normalizeRotation();
    }

    public static void resetRotation() {
        rotation = 180.0F;
    }

    public static boolean isControlsEnabled() {
        return controlsEnabled;
    }

    public static void setControlsEnabled(
            boolean enabled
    ) {
        controlsEnabled = enabled;
    }

    public static void toggleControls() {
        controlsEnabled =
                !controlsEnabled;
    }

    private static void normalizeRotation() {
        while (rotation >= 360.0F) {
            rotation -= 360.0F;
        }

        while (rotation < 0.0F) {
            rotation += 360.0F;
        }
    }
}
