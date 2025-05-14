use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqjE8CAzU8qghvQvCr4gRkfd");

#[program]
pub mod solana_anchor_example {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
