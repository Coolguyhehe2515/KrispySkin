package com.krispyskin.mod.mixin;

import com.krispyskin.mod.client.PlayerPreviewRenderer;
import com.krispyskin.mod.screen.WardrobeScreen;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.GameMenuScreen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(GameMenuScreen.class)
public class PauseMenuMixin {

    @Inject(
            method = "initWidgets",
            at = @At("TAIL")
    )
    private void krispyskin$addWardrobeButton(
            CallbackInfo ci
    ) {
        GameMenuScreen screen =
                (GameMenuScreen) (Object) this;

        MinecraftClient client =
                MinecraftClient.getInstance();

        ((ScreenInvoker) screen)
                .krispyskin$addDrawableChild(
                        ButtonWidget.builder(
                                Text.literal("Wardrobe"),
                                button -> {
                                    PlayerPreviewRenderer
                                            .stopControl();

                                    client.setScreen(
                                            new WardrobeScreen(
                                                    screen
                                            )
                                    );
                                }
                        )
                        .dimensions(
                                screen.width - 230,
                                screen.height - 105,
                                90,
                                20
                        )
                        .build()
                );
    }

    @Inject(
            method = "keyPressed",
            at = @At("HEAD"),
            cancellable = true
    )
    private void krispyskin$handleZKey(
            int keyCode,
            int scanCode,
            int modifiers,
            CallbackInfo ci
    ) {
        /*
         * GLFW_KEY_Z = 90
         */
        if (keyCode == 90) {
            if (PlayerPreviewRenderer.isControlling()) {
                PlayerPreviewRenderer.stopControl();
            } else {
                MinecraftClient client =
                        MinecraftClient.getInstance();

                PlayerPreviewRenderer.startControl(
                        (int) client.mouse.getX()
                );
            }

            ci.cancel();
        }
    }

    @Inject(
            method = "mouseMoved",
            at = @At("HEAD")
    )
    private void krispyskin$handleMouseMove(
            double mouseX,
            double mouseY,
            CallbackInfo ci
    ) {
        if (!PlayerPreviewRenderer.isControlling()) {
            return;
        }

        PlayerPreviewRenderer.updateMouse(
                (int) mouseX
        );
    }

    @Inject(
            method = "removed",
            at = @At("HEAD")
    )
    private void krispyskin$stopPreviewControl(
            CallbackInfo ci
    ) {
        PlayerPreviewRenderer.stopControl();
    }

    @Inject(
            method = "render",
            at = @At("TAIL")
    )
    private void krispyskin$renderPreview(
            DrawContext context,
            int mouseX,
            int mouseY,
            float delta,
            CallbackInfo ci
    ) {
        GameMenuScreen screen =
                (GameMenuScreen) (Object) this;

        PlayerPreviewRenderer.render(
                context.getMatrices(),
                screen.width - 130,
                screen.height - 95,
                45
        );
    }
}
