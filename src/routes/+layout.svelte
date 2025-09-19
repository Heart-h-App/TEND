<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/getMoar.svelte';
	import { page } from '$app/stores';
	import { auth, isAuthenticated } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let { children } = $props();
	
	// Hide footer on paulConnect page
	const showFooter = $derived($page.route.id !== '/paulConnect');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Header />
{@render children?.()}
{#if showFooter}
	<Footer />
{/if}
