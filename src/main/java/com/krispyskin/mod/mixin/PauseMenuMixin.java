package com.krispyskin.mod.mixin;

import com.krispyskin.mod.client.PlayerPreviewRenderer;
import com.krispyskin.mod.screen.WardrobeScreen;
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
    private void krispyskin$addWardrobeButton(CallbackInfo ci) {
        GameMenuScreen screen =
                (GameMenuScreen) (Object) this;

        screen.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("WARDROBE"),
                        button -> {
                            if (screen.client != null) {
                                screen.client.setScreen(
                                        new WardrobeScreen(screen)
                                );
                            }
                        }
                )
                .dimensions(
                        screen.width - 160,
                        screen.height - 70,
                        100,
                        20
                )
                .build()
        );
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
