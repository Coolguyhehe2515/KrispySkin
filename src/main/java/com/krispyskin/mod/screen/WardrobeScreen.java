package com.krispyskin.mod.screen;

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

        /*
         * Dummy/local skins.
         *
         * Nanti bagian ini bisa diganti dengan data
         * yang berasal dari KrispySkin API.
         */
        skins.add(new SkinEntry("Default"));
        skins.add(new SkinEntry("Krispy"));
        skins.add(new SkinEntry("Classic"));
        skins.add(new SkinEntry("Blue"));
    }

    @Override
    protected void init() {
        super.init();

        int centerX = this.width / 2;

        /*
         * Tombol kembali.
         */
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

        /*
         * Arrow kiri.
         */
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

        /*
         * Arrow kanan.
         */
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

        /*
         * Tombol equip/select.
         */
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

        /*
         * Untuk sementara kita hubungkan dengan SkinSelection.
         *
         * Nanti ini bisa diganti dengan:
         * KrispySkinAPI.selectSkin(...)
         */
        SkinSelection.setSelected(selected.name());

        updateButtons();
    }

    private void updateButtons() {
        if (skins.isEmpty()) {
            if (previousButton != null) {
                previousButton.active = false;
            }

            if (nextButton != null) {
                nextButton.active = false;
            }

            if (selectButton != null) {
                selectButton.active = false;
            }

            return;
        }

        if (previousButton != null) {
            previousButton.active = skins.size() > 1;
        }

        if (nextButton != null) {
            nextButton.active = skins.size() > 1;
        }

        if (selectButton != null) {
            selectButton.active = true;
        }
    }

    @Override
    public void close() {
        if (this.client != null) {
            this.client.setScreen(parent);
        }
    }

    @Override
    public void render(
            DrawContext context,
            int mouseX,
            int mouseY,
            float delta
    ) {
        /*
         * Background vanilla.
         */
        this.renderBackground(context);

        int centerX = this.width / 2;

        /*
         * Header.
         */
        context.drawCenteredTextWithShadow(
                this.textRenderer,
                Text.literal("WARDROBE"),
                centerX,
                20,
                0xFFFFFFFF
        );

        /*
         * Skin name.
         */
        if (!skins.isEmpty()) {
            SkinEntry selected = skins.get(selectedIndex);

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal(selected.name()),
                    centerX,
                    42,
                    0xFFFFFFFF
            );
        }

        /*
         * Preview area.
         *
         * PlayerPreviewRenderer nanti bisa dipakai di sini.
         */
        renderPreview(context, centerX, this.height / 2);

        /*
         * Skin counter.
         */
        if (!skins.isEmpty()) {
            String counter =
                    (selectedIndex + 1) + " / " + skins.size();

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal(counter),
                    centerX,
                    this.height - 82,
                    0xFFAAAAAA
            );
        }

        /*
         * Render widgets.
         */
        super.render(context, mouseX, mouseY, delta);
    }

    private void renderPreview(
            DrawContext context,
            int x,
            int y
    ) {
        /*
         * Untuk sementara area preview.
         *
         * Kita sengaja belum memanggil
         * PlayerPreviewRenderer karena renderer
         * kamu sekarang mungkin masih memakai
         * MatrixStack dari pause menu.
         *
         * Setelah WardrobeScreen berhasil dibuild,
         * preview yang sama bisa kita sambungkan.
         */

        int previewWidth = 120;
        int previewHeight = 180;

        int left = x - previewWidth / 2;
        int top = y - previewHeight / 2;

        context.fill(
                left,
                top,
                left + previewWidth,
                top + previewHeight,
                0x33000000
        );

        context.drawCenteredTextWithShadow(
                this.textRenderer,
                Text.literal("PLAYER"),
                x,
                y - 5,
                0xFFAAAAAA
        );
    }

    private record SkinEntry(String name) {
    }
}
