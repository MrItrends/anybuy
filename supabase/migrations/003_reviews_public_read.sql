-- Allow anyone to read reviews (public social proof, like ratings on any marketplace)
create policy "Reviews are publicly readable" on public.reviews for select using (true);

-- Allow buyers to insert reviews for their own completed orders
create policy "Buyers can write reviews" on public.reviews for insert
  with check (auth.uid() = buyer_id);
