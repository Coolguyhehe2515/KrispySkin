package com.krispyskin.mod.screen;

import com.krispyskin.mod.api.KrispySkinApiClient;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.widget.ButtonWidget;
import net.minecraft.client.gui.widget.TextFieldWidget;
import net.minecraft.text.Text;
import net.minecraft.util.Util;

import java.net.URI;

public class LoginScreen extends Screen {

    private final Screen parent;

    private TextFieldWidget usernameField;
    private TextFieldWidget passwordField;

    private String status = "";

    public LoginScreen(Screen parent) {
        super(Text.literal("KrispySkin Login"));
        this.parent = parent;
    }

    @Override
    protected void init() {
        super.init();

        int centerX = this.width / 2;

        usernameField =
                new TextFieldWidget(
                        this.textRenderer,
                        centerX - 100,
                        70,
                        200,
                        20,
                        Text.literal("Username")
                );

        usernameField.setMaxLength(64);

        this.addDrawableChild(
                usernameField
        );

        passwordField =
                new TextFieldWidget(
                        this.textRenderer,
                        centerX - 100,
                        105,
                        200,
                        20,
                        Text.literal("Password")
                );

        passwordField.setMaxLength(128);
        passwordField.setRenderTextProvider(
                (text, firstLine) ->
                        Text.literal(
                                "*".repeat(text.length())
                        )
        );

        this.addDrawableChild(
                passwordField
        );

        this.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("Login"),
                        button -> login()
                )
                .dimensions(
                        centerX - 100,
                        140,
                        200,
                        20
                )
                .build()
        );

        this.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("Register here"),
                        button -> openWebsite()
                )
                .dimensions(
                        centerX - 100,
                        175,
                        200,
                        20
                )
                .build()
        );

        this.addDrawableChild(
                ButtonWidget.builder(
                        Text.literal("Back"),
                        button -> close()
                )
                .dimensions(
                        centerX - 100,
                        210,
                        200,
                        20
                )
                .build()
        );
    }

    private void login() {
        String username =
                usernameField.getText().trim();

        String password =
                passwordField.getText();

        if (username.isEmpty()
                || password.isEmpty()) {

            status =
                    "Enter username and password.";

            return;
        }

        status = "Logging in...";

        Thread thread =
                new Thread(
                        () -> {

                            KrispySkinApiClient.LoginResult result =
                                    KrispySkinApiClient.login(
                                            username,
                                            password
                                    );

                            MinecraftClient client =
                                    MinecraftClient.getInstance();

                            client.execute(
                                    () -> {

                                        if (result.success()) {

                                            status =
                                                    "Login successful!";

                                            client.setScreen(
                                                    parent
                                            );

                                        } else {

                                            status =
                                                    result.error() != null
                                                            ? result.error()
                                                            : "Login failed.";
                                        }
                                    }
                            );
                        }
                );

        thread.setName(
                "KrispySkin-Login"
        );

        thread.start();
    }

    private void openWebsite() {
        try {
            Util.getOperatingSystem()
                    .open(
                            URI.create(
                                    "https://krispy-skin.vercel.app/"
                            )
                    );

        } catch (Exception e) {
            e.printStackTrace();
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
                Text.literal("KrispySkin"),
                centerX,
                25,
                0xFFFFFFFF
        );

        context.drawCenteredTextWithShadow(
                this.textRenderer,
                Text.literal(
                        "Login to your KrispySkin account"
                ),
                centerX,
                45,
                0xFFAAAAAA
        );

        context.drawCenteredTextWithShadow(
                this.textRenderer,
                Text.literal(status),
                centerX,
                245,
                0xFFFFFFFF
        );

        super.render(
                context,
                mouseX,
                mouseY,
                delta
        );
    }

    @Override
    public void close() {
        MinecraftClient client =
                MinecraftClient.getInstance();

        client.setScreen(parent);
    }
}
