package com.krispyskin.mod.screen;

import com.krispyskin.mod.client.KrispySkinTextureManager;
import com.krispyskin.mod.skin.SkinSelection;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;

public class WardrobeScreen extends Screen {

    private final Screen parent;
    private final List<SkinEntry> skins = new ArrayList<>();

    private int selectedIndex = 0;

    private ButtonWidget previousButton;
    private ButtonWidget nextButton;
    private ButtonWidget selectButton;

    public WardrobeScreen(Screen parent) {
        super(Text.literal("KrispySkin Wardrobe"));

        this.parent = parent;

        skins.add(new SkinEntry("Default", null));
        skins.add(new SkinEntry("Krispy", null));
        skins.add(new SkinEntry("Classic", null));
        skins.add(new SkinEntry("Blue", null));
    }

    @Override
    protected void init() {
        super.init();

        int centerX = this.width / 2;

        this.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("Back"),
                        button -> this.close()
                )
                .dimensions(
                        10,
                        10,
                        60,
                        20
                )
                .build()
        );

        previousButton = this.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("←"),
                        button -> previousSkin()
                )
                .dimensions(
                        centerX - 150,
                        this.height - 55,
                        40,
                        20
                )
                .build()
        );

        selectButton = this.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("Select"),
                        button -> selectSkin()
                )
                .dimensions(
                        centerX - 60,
                        this.height - 55,
                        120,
                        20
                )
                .build()
        );

        nextButton = this.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("→"),
                        button -> nextSkin()
                )
                .dimensions(
                        centerX + 110,
                        this.height - 55,
                        40,
                        20
                )
                .build()
        );

        updateButtons();
    }

    private void previousSkin() {
        if (skins.isEmpty()) {
            return;
        }

        selectedIndex--;

        if (selectedIndex < 0) {
            selectedIndex = skins.size() - 1;
        }

        updateButtons();
    }

    private void nextSkin() {
        if (skins.isEmpty()) {
            return;
        }

        selectedIndex++;

        if (selectedIndex >= skins.size()) {
            selectedIndex = 0;
        }

        updateButtons();
    }

    private void selectSkin() {
        if (skins.isEmpty()) {
            return;
        }

        SkinEntry selected = skins.get(selectedIndex);

        SkinSelection.setSelectedSkin(selectedIndex);

        if (selected.id() != null) {
            KrispySkinTextureManager.setActiveSkin(
                    selected.id()
            );
        }

        MinecraftClient client =
                MinecraftClient.getInstance();

        if (client.player != null) {
            KrispySkinTextureManager.refreshPlayerSkin(
                    client.player
            );
        }

        updateButtons();
    }

    private void updateButtons() {
        boolean hasSkins = !skins.isEmpty();
        boolean multipleSkins = skins.size() > 1;

        if (previousButton != null) {
            previousButton.active = multipleSkins;
        }

        if (nextButton != null) {
            nextButton.active = multipleSkins;
        }

        if (selectButton != null) {
            selectButton.active = hasSkins;
        }
    }

    @Override
    public void close() {
        MinecraftClient client =
                MinecraftClient.getInstance();

        if (client != null) {
            client.setScreen(parent);
        }
    }

    @Override
    public void render(
            DrawContext context,
            int mouseX,
            int mouseY,
            float delta
    ) {
        this.renderBackground(context);

        int centerX = this.width / 2;

        context.drawCenteredTextWithShadow(
                this.textRenderer,
                Text.literal("WARDROBE"),
                centerX,
                20,
                0xFFFFFFFF
        );

        if (!skins.isEmpty()) {
            SkinEntry selected =
                    skins.get(selectedIndex);

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal(selected.name()),
                    centerX,
                    42,
                    0xFFFFFFFF
            );
        }

        renderPreview(
                context,
                centerX,
                this.height / 2,
                delta
        );

        if (!skins.isEmpty()) {
            String counter =
                    (selectedIndex + 1)
                            + " / "
                            + skins.size();

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal(counter),
                    centerX,
                    this.height - 82,
                    0xFFAAAAAA
            );
        }

        super.render(
                context,
                mouseX,
                mouseY,
                delta
        );
    }

    private void renderPreview(
            DrawContext context,
            int x,
            int y,
            float delta
    ) {
        int previewWidth = 140;
        int previewHeight = 190;

        int left =
                x - previewWidth / 2;

        int top =
                y - previewHeight / 2;

        context.fill(
                left,
                top,
                left + previewWidth,
                top + previewHeight,
                0x33000000
        );

        MinecraftClient client =
                MinecraftClient.getInstance();

        if (client.player != null) {
            KrispySkinTextureManager.renderPreview(
                    context,
                    client.player,
                    x,
                    y + 65,
                    55
            );
        } else {
            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal("PLAYER"),
                    x,
                    y,
                    0xFFAAAAAA
            );
        }
    }

    private record SkinEntry(
            String name,
            String id
    ) {
    }
}
