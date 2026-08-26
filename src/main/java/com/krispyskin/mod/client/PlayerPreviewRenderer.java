package com.krispyskin.mod.client;

import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.render.entity.EntityRenderDispatcher;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.RotationAxis;

public final class PlayerPreviewRenderer {

    private static float rotation = 180.0F;

    private static boolean controlling = false;

    private static int lastMouseX;

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

        matrices.push();

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
                RotationAxis.POSITIVE_Z
                        .rotationDegrees(180.0F)
        );

        matrices.translate(
                0.0F,
                -1.0F,
                0.0F
        );

        matrices.multiply(
                RotationAxis.POSITIVE_Y
                        .rotationDegrees(rotation)
        );

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
    }

    public static void startControl(
            int mouseX
    ) {
        controlling = true;
        lastMouseX = mouseX;
    }

    public static void stopControl() {
        controlling = false;
    }

    public static boolean isControlling() {
        return controlling;
    }

    public static void updateMouse(
            int mouseX
    ) {
        if (!controlling) {
            lastMouseX = mouseX;
            return;
        }

        int difference =
                mouseX - lastMouseX;

        rotation += difference * 0.5F;

        lastMouseX = mouseX;
    }

    public static void resetRotation() {
        rotation = 180.0F;
    }

    public static float getRotation() {
        return rotation;
    }
}
