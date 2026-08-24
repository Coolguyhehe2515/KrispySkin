package com.krispyskin.mod.client;

import com.mojang.blaze3d.systems.RenderSystem;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.network.ClientPlayerEntity;
import net.minecraft.client.render.*;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.entity.player.PlayerEntity;
import net.minecraft.util.math.RotationAxis;

public final class PlayerPreviewRenderer {

    private PlayerPreviewRenderer() {
    }

    public static void render(
            MatrixStack matrices,
            int x,
            int y,
            int size
    ) {
        MinecraftClient client = MinecraftClient.getInstance();

        ClientPlayerEntity player = client.player;

        if (player == null) {
            return;
        }

        RenderSystem.enableDepthTest();

        matrices.push();

        matrices.translate(x, y, 1050.0F);
        matrices.scale(size, size, size);

        matrices.multiply(
                RotationAxis.POSITIVE_Z.rotationDegrees(180.0F)
        );

        matrices.translate(
                0.0F,
                -1.0F,
                0.0F
        );

        float yaw = player.getYaw();

        matrices.multiply(
                RotationAxis.POSITIVE_Y.rotationDegrees(180.0F)
        );

        player.setYaw(180.0F);
        player.setBodyYaw(180.0F);
        player.setHeadYaw(180.0F);

        MinecraftClient.getInstance()
                .getEntityRenderDispatcher()
                .render(
                        player,
                        0.0D,
                        0.0D,
                        0.0D,
                        0.0F,
                        1.0F,
                        matrices,
                        client.getBufferBuilders().getEntityVertexConsumers(),
                        15728880
                );

        client.getBufferBuilders()
                .getEntityVertexConsumers()
                .draw();

        player.setYaw(yaw);

        matrices.pop();

        RenderSystem.disableDepthTest();
    }
}
