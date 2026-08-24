package com.krispyskin.mod.client;

import com.krispyskin.mod.skin.SkinSelection;
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
    private void krispyskin$addSelector(CallbackInfo ci) {
        GameMenuScreen screen = (GameMenuScreen) (Object) this;

        ((ScreenInvoker) screen).krispyskin$addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("←"),
                        button -> SkinSelection.previous()
                )
                .dimensions(
                        screen.width - 190,
                        screen.height - 70,
                        30,
                        20
                )
                .build()
        );

        ((ScreenInvoker) screen).krispyskin$addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("→"),
                        button -> SkinSelection.next()
                )
                .dimensions(
                        screen.width - 70,
                        screen.height - 70,
                        30,
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
        GameMenuScreen screen = (GameMenuScreen) (Object) this;

        PlayerPreviewRenderer.render(
                context.getMatrices(),
                screen.width - 130,
                screen.height - 95,
                45
        );
    }
}
