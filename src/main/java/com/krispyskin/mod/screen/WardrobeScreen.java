package com.krispyskin.mod.screen;

import com.krispyskin.mod.api.KrispySkinApiClient;
import com.krispyskin.mod.skin.SkinSelection;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

public class WardrobeScreen extends Screen {

    private final Screen parent;

    private final List<KrispySkinApiClient.Skin> skins =
            new ArrayList<>();

    private int selectedIndex = 0;

    private String activeSkinId;

    private boolean loading = true;
    private boolean selecting = false;

    private String errorMessage;

    private ButtonWidget previousButton;
    private ButtonWidget nextButton;
    private ButtonWidget selectButton;

    public WardrobeScreen(Screen parent) {
        super(Text.literal("KrispySkin Wardrobe"));
        this.parent = parent;
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

        loadLibrary();
    }

    private void loadLibrary() {
        loading = true;
        errorMessage = null;
        updateButtons();

        CompletableFuture
                .supplyAsync(
                        KrispySkinApiClient::getLibrary
                )
                .thenAccept(
                        result -> {
                            if (this.client == null) {
                                return;
                            }

                            this.client.execute(
                                    () -> applyLibraryResult(result)
                            );
                        }
                )
                .exceptionally(
                        throwable -> {
                            if (this.client != null) {
                                this.client.execute(
                                        () -> {
                                            loading = false;
                                            errorMessage =
                                                    throwable.getMessage();

                                            updateButtons();
                                        }
                                );
                            }

                            return null;
                        }
                );
    }

    private void applyLibraryResult(
            KrispySkinApiClient.LibraryResult result
    ) {
        loading = false;

        skins.clear();

        if (!result.success()) {
            errorMessage =
                    result.error() != null
                            ? result.error()
                            : "Failed to load skin library";

            updateButtons();
            return;
        }

        skins.addAll(result.skins());

        activeSkinId =
                result.activeSkin();

        if (skins.isEmpty()) {
            selectedIndex = 0;
            errorMessage = "Your skin library is empty";
            updateButtons();
            return;
        }

        selectedIndex = 0;

        if (activeSkinId != null) {
            for (int i = 0; i < skins.size(); i++) {
                if (activeSkinId.equals(
                        skins.get(i).id()
                )) {
                    selectedIndex = i;
                    break;
                }
            }
        }

        updateButtons();
    }

    private void previousSkin() {
        if (loading || skins.size() <= 1) {
            return;
        }

        selectedIndex--;

        if (selectedIndex < 0) {
            selectedIndex = skins.size() - 1;
        }

        updateButtons();
    }

    private void nextSkin() {
        if (loading || skins.size() <= 1) {
            return;
        }

        selectedIndex++;

        if (selectedIndex >= skins.size()) {
            selectedIndex = 0;
        }

        updateButtons();
    }

    private void selectSkin() {
        if (loading
                || selecting
                || skins.isEmpty()
                || selectedIndex < 0
                || selectedIndex >= skins.size()) {
            return;
        }

        KrispySkinApiClient.Skin skin =
                skins.get(selectedIndex);

        if (skin.id() == null
                || skin.id().isEmpty()) {
            return;
        }

        selecting = true;
        errorMessage = null;

        updateButtons();

        CompletableFuture
                .supplyAsync(
                        () ->
                                KrispySkinApiClient.loadSkin(
                                        skin.id()
                                )
                )
                .thenAccept(
                        result -> {
                            if (this.client == null) {
                                return;
                            }

                            this.client.execute(
                                    () -> {
                                        selecting = false;

                                        if (result.success()) {
                                            activeSkinId =
                                                    result.activeSkin();

                                            SkinSelection
                                                    .setSelectedSkin(
                                                            selectedIndex
                                                    );

                                            SkinSelection
                                                    .setSelectedSkinId(
                                                            skin.id()
                                                    );
                                        } else {
                                            errorMessage =
                                                    result.error() != null
                                                            ? result.error()
                                                            : "Failed to select skin";
                                        }

                                        updateButtons();
                                    }
                            );
                        }
                )
                .exceptionally(
                        throwable -> {
                            if (this.client != null) {
                                this.client.execute(
                                        () -> {
                                            selecting = false;
                                            errorMessage =
                                                    throwable.getMessage();

                                            updateButtons();
                                        }
                                );
                            }

                            return null;
                        }
                );
    }

    private void updateButtons() {
        boolean hasSkins =
                !skins.isEmpty();

        boolean multipleSkins =
                skins.size() > 1;

        if (previousButton != null) {
            previousButton.active =
                    !loading
                            && !selecting
                            && multipleSkins;
        }

        if (nextButton != null) {
            nextButton.active =
                    !loading
                            && !selecting
                            && multipleSkins;
        }

        if (selectButton != null) {
            selectButton.active =
                    !loading
                            && !selecting
                            && hasSkins;

            if (selecting) {
                selectButton.setMessage(
                        Text.literal("Loading...")
                );
            } else {
                selectButton.setMessage(
                        Text.literal("Select")
                );
            }
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
        this.renderBackground(context);

        int centerX =
                this.width / 2;

        context.drawCenteredTextWithShadow(
                this.textRenderer,
                Text.literal("WARDROBE"),
                centerX,
                20,
                0xFFFFFFFF
        );

        if (loading) {

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal("Loading skin library..."),
                    centerX,
                    45,
                    0xFFAAAAAA
            );

        } else if (!skins.isEmpty()) {

            KrispySkinApiClient.Skin selected =
                    skins.get(selectedIndex);

            String name =
                    selected.filename() != null
                            ? selected.filename()
                            : "Skin";

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal(name),
                    centerX,
                    42,
                    0xFFFFFFFF
            );

            renderPreview(
                    context,
                    centerX,
                    this.height / 2
            );

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

            if (selected.id() != null
                    && selected.id().equals(activeSkinId)) {

                context.drawCenteredTextWithShadow(
                        this.textRenderer,
                        Text.literal("ACTIVE"),
                        centerX,
                        this.height - 100,
                        0xFF55FF55
                );
            }

        } else {

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal(
                            errorMessage != null
                                    ? errorMessage
                                    : "No skins available"
                    ),
                    centerX,
                    this.height / 2,
                    0xFFFF5555
            );
        }

        if (errorMessage != null
                && !loading
                && !skins.isEmpty()) {

            context.drawCenteredTextWithShadow(
                    this.textRenderer,
                    Text.literal(errorMessage),
                    centerX,
                    this.height - 115,
                    0xFFFF5555
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
            int y
    ) {
        int previewWidth = 120;
        int previewHeight = 180;

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

        context.drawCenteredTextWithShadow(
                this.textRenderer,
                Text.literal("PLAYER"),
                x,
                y - 5,
                0xFFAAAAAA
        );
    }
}
