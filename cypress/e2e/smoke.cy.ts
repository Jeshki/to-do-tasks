describe("smoke", () => {
  it("shows the sign-in form", () => {
    cy.visit("/signin");
    cy.get('[data-testid="signin-email"]').should("be.visible");
    cy.get('[data-testid="signin-password"]').should("be.visible");
    cy.get('[data-testid="signin-submit"]').should("be.visible");
  });
});
